import * as vega from 'vega';
import { isObject, toArray } from '../jsTypes';
import { Dict, failure, Result } from '../commonTypes';
import { Format } from 'vega';
import * as WarningLogger from '../logging/warningLogger'
import * as ErrorLogger from '../logging/errorLogger'

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
export async function loadDataset(dataset: Record<string, unknown>, outDatasets: Dict): Promise<Result<true>> {
    const loader = vega.loader()
    const name: string = dataset.name as string
    let outData: unknown
    if(dataset.values){
      if(isSignal(dataset.values) || hasSignal(dataset.format)){
        WarningLogger.logWarning({
          location: ["TODO"],
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
          location: ["TODO"],
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
        if(!outDatasets[source as string]){
          ErrorLogger.logError({
            location: ["TODO"],
            error:{
              type: 'nonexistentDataset',
              datasetName: source as string,
              availableTables: Object.keys(outDatasets)
            }
          })
        }
        return outDatasets[source as string]
      })
    }
  
    outData = toArray(outData).map((val: unknown) => {
      if (!isObject(val)) {
        return { "data": val };
      }
      return val;
    })
    outDatasets[name] = outData
    return true
  }