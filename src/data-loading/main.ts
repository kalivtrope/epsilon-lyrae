import * as vega from 'vega';
import { isObject, toArray } from '../types/jsTypes';
import { Dict, failure, Result, Runtime, Scope } from '../types/commonTypes';
import { Format } from 'vega';
import * as WarningLogger from '../logging/warningLogger'
import * as ErrorLogger from '../logging/errorLogger'
import { UnsupportedFeatureWarning } from '../warnings/warnings';

/* Main logic for correctly loading data from Vega specifications.
   Mostly reverse-engineered from observed behavior and Vega implementation.
*/

const signalWarning: UnsupportedFeatureWarning = {
  type: "unsupportedFeature",
  message: "Signals aren't supported."
}

/* Slightly obscure way to check that an object has a signal property.*/
function isSignal(x: unknown): boolean {
  return !!x && !!(isObject(x) && x.signal);
}

function hasSignal(x: unknown) {
  if (isSignal(x))
    return true;
  if (isObject(x))
    for (const key in x) {
      if (hasSignal(x[key] as Record<string, unknown>))
        return true;
    }
  return false;
}

/*

*/
function lookupDatasetData(scope: Scope | undefined, datasetName: string): unknown[] | undefined {
  while(scope != undefined){
    if(scope.datasetData[datasetName] != undefined){
      return scope.datasetData[datasetName]
    }
    scope = scope.parent
  }
  return undefined;
}

/* Implement dataset loading in accordance to Vega's logic.
  A dataset source has one of the following three (disjunct) representations:
  1) `values`: data objects embedded inside a specification. Might be subject to additional formatting rules,
               hence the access to dataset.format.
  2) `url`: data is stored in a url, be it a path on a local filesystem or an http url
  3) `source: data is read from an already defined dataset

*/
export async function loadDatasetData(runtime: Runtime, dataset: Record<string, unknown>): Promise<Result<unknown[]>>{
  const loader = vega.loader()
  const name: string = dataset.name as string
  let outData: unknown[] = []
  if(dataset.values){
    if(isSignal(dataset.values) || hasSignal(dataset.format)){
      WarningLogger.logWarning({
        location: runtime.prefix,
        warning: signalWarning
      })
      return failure
    }
    else {
      outData = vega.read(dataset.values as string, dataset.format as Format)
    }
  }
  else if(dataset.url){
    if(hasSignal(dataset.url) || hasSignal(dataset.format)){
      WarningLogger.logWarning({
        location: runtime.prefix,
        warning: signalWarning
      })
      return failure
    }
    else{
      try{
        await loader.load(dataset.url as string).then((ds) => {
          outData = vega.read(ds, dataset.format as Format);
        });
      }
      catch(e){
        ErrorLogger.logError({
          location: runtime.prefix,
          error: {
            type: 'urlLoadingError',
            url: dataset.url as string
          }
        })
      }
    }
  }
  else if(dataset.source){
    const sources = toArray(dataset.source);
    outData = sources.flatMap((source) => {
      const data = lookupDatasetData(runtime.scope, source as string)
      if(!data){
        ErrorLogger.logError({
          location: runtime.prefix,
          error:{
            type: 'nonexistentDataset',
            datasetName: source as string,
            availableTables: listDatasetNames(runtime.scope)
          }
        })
        return failure;
      }
      return data
    })
  }
  else {
    return failure;
  }

  outData = toArray(outData).map((val: unknown) => {
    /* Implementation detail: if the data tuple `val` isn't an object,
     * wrap it inside of {"data": val}
     */
    if (!isObject(val)) {
      return { "data": val };
    }
    return val;
  })
  return outData;
}

/* Recursively list dataset names in current scope to provide context
 * in case of error.
 */
function listDatasetNames(scope: Scope | undefined): string[] {
  if(scope == undefined)
    return []
  return listDatasetNames(scope.parent).concat(Object.keys(scope.datasets))
}
