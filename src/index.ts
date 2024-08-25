import * as fs from 'fs';
import * as vega from 'vega';

let error = vega.error

function isSignal(x: any): boolean {
  return x && x.signal;
}

function isObject(x: any): x is {[index: string]: any} {
  return x === Object(x)
}

function toArray(x: any): any[] { // convert x to array if it isn't an array already
  return x != null ? (Array.isArray(x) ? x : [x]) : [];
}

function hasSignal(x: any) {
  if (isSignal(x))
    return true;
  if (isObject(x))
    for (const key in x) {
      if (hasSignal(x[key]))
        return true;
    }
  return false;
}

type Dict = {[index: string]: any}

async function loadDataset(dataset: any, outDatasets: Dict){
  let loader = vega.loader()
  let name: string = dataset.name
  let outData: any
  if(dataset.values){
    if(isSignal(dataset.values) || hasSignal(dataset.format)){
      error("Signals aren't supported")
    }
    else {
      outData = vega.read(dataset.values, dataset.format)
    }
  }

  else if(dataset.url){
    if(hasSignal(dataset.url) || hasSignal(dataset.format)){
      error("Signals aren't supported")
    }
    else{
      await loader.load(dataset.url).then((ds) => {
        outData = vega.read(ds, dataset.format);
      });
    }
  }

  else if(dataset.source){
    let sources = toArray(dataset.source);
    outData = sources.flatMap((source: string) => {
      if(!outDatasets[source]){
        error(`dataset ${source} is not defined`)
      }
      return outDatasets[source]
    })
  }

  outData = outData.map((val: any) => {
    if (!isObject(val)) {
      return { "data": val };
    }
    return val;
  })
  outDatasets[name] = outData
}

async function loadDatasets(dataSpec: any){
  let outDatasets: Dict = {}
  for(let key of toArray(dataSpec)){
    await loadDataset(key, outDatasets)
  }
  return outDatasets
}

let rawSpec = fs.readFileSync(0, 'utf-8');
let parsedSpec = JSON.parse(rawSpec)

function checkDataTabularity(data: Dict){

}

loadDatasets(parsedSpec.data).then((outDatasets) => {
  checkDataTabularity(outDatasets);
})