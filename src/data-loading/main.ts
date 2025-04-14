import * as vega from 'vega';
import { isObject, toArray } from '../jsTypes';
import { Dict, failure, Result } from '../commonTypes';
import { Format } from 'vega';
import * as WarningLogger from '../logging/warningLogger'
import * as ErrorLogger from '../logging/errorLogger'
import { Runtime } from 'index';
import { Scope } from '../scope';

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

export interface UnsupportedFeatureWarning {
  type: "unsupportedFeature"
  message: string
}

export function isUnsupportedFeatureWarning(val: unknown): val is UnsupportedFeatureWarning {
  return (val as UnsupportedFeatureWarning).type == "unsupportedFeature"
}
const signalWarning: UnsupportedFeatureWarning = {
  type: "unsupportedFeature",
  message: "Signals aren't supported."
}

function lookupDatasetData(scope: Scope | undefined, datasetName: string): unknown[] | undefined {
  while(scope != undefined){
    if(scope.datasetData[datasetName] != undefined){
      return scope.datasetData[datasetName]
    }
    scope = scope.parent
  }
  return undefined;
}

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
      await loader.load(dataset.url as string).then((ds) => {
        outData = vega.read(ds, dataset.format as Format);
      });
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
    if (!isObject(val)) {
      return { "data": val };
    }
    return val;
  })
  return outData;
}

function listDatasetNames(scope: Scope | undefined): string[] {
  if(scope == undefined)
    return []
  return listDatasetNames(scope.parent).concat(Object.keys(scope.datasets))
}
