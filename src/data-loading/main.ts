import * as vega from 'vega';
import { isObject, toArray } from '../jsTypes';
import { Dict } from '../commonTypes';
import { Format } from 'vega';

const error = vega.error

function isSignal(x: unknown): boolean {
  return !!x && !!(!isObject(x) || x.signal);
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

async function loadDataset(dataset: Record<string, unknown>, outDatasets: Dict){
    const loader = vega.loader()
    const name: string = dataset.name as string
    let outData: unknown
    if(dataset.values){
      if(isSignal(dataset.values) || hasSignal(dataset.format)){
        error("Signals aren't supported")
      }
      else {
        outData = vega.read(dataset.values as string, dataset.format as Format)
      }
    }
  
    else if(dataset.url){
      if(hasSignal(dataset.url) || hasSignal(dataset.format)){
        error("Signals aren't supported")
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
          error(`dataset ${source} is not defined`)
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
  }
  
export async function loadDatasets(dataSpec: unknown){
    const outDatasets: Dict = {}
    for(const key of toArray(dataSpec)){
      await loadDataset(key as Record<string, unknown>, outDatasets)
    }
    return outDatasets
  }