import Ajv from 'ajv';
import addFormats from 'ajv-formats';
//import vegaSchema from 'vega/build/vega-schema.json';
//import jsonSchema from 'ajv/dist/refs/json-schema-draft-06.json'
import * as fs from 'fs';
import * as vega from 'vega';

function isSignal(x: any): boolean {
  return x && x.signal;
}

function isObject(x: any): x is {[index: string]: any} {
  return x === Object(x)
}

function toArray(x: any): any[] {
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
  let name: string = ""
  let out: any
  if(dataset.values){
    if(isSignal(dataset.values) || hasSignal(dataset.format)){
      vega.error("Signals aren't supported")
    }
    else {
      name = dataset.name
      out = vega.read(dataset.values, dataset.format)
    }
  }
  else if(dataset.url){
    if(hasSignal(dataset.url) || hasSignal(dataset.format)){
      vega.error("Signals aren't supported")
    }
    else{
      name = dataset.name
      await loader.load(dataset.url).then(function(ds){
          out = vega.read(ds, dataset.format)
          console.log(out)
      });
    }
  }
  else if(dataset.source){
    vega.error("not implemented yet")
  }
  out = out.map(function(val: any){
    if(!isObject(val)){
      return {"data": val}
    }
    return val
    })
  outDatasets[name] = out
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