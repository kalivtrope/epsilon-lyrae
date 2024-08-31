import * as fs from 'fs';
import * as vega from 'vega';

let error = vega.error

function isSignal(x: any): boolean {
  return x && x.signal;
}

function isObject(x: any): x is {[index: string]: any} {
  return x === Object(x)
}

function isArray(x: any): x is any[] {
  return Array.isArray(x)
}

function toArray(x: any): any[] {
  // convert x to array if it isn't an array already
  return x != null ? (isArray(x) ? x : [x]) : [];
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

type Context = {
  datasetName : string,
  indices: Path
}

type Key = string | number
type Path = Key[]

function pathToString(path: Path): string {
 if(path.length == 0){
  return "";
 }
 let out = path[0].toString()
 for(let i = 1; i < path.length; i++){
  if(typeof path[i] == 'number'){
    out += "[" + path[i] + "]"
  }
  else{
    out += "." + path[i]
  }
 }
 return out;
}

type IncompleteFieldError = {
  type: "incompleteField",
  context: Context,
  incompleteKeys: string[],
  completeKeys: string[]
}


type Intersection = {
  keys: string[]
}

type Shape = {[key: string]: Shape} | Shape[]

type MismatchedDatumError = {
  type: "mismatchedDatum"
  context: Context,
  possibleTypes: string[]
}

type InconsistentDataError = IncompleteFieldError | MismatchedDatumError

function getKeyIntersection(dataset: Dict, ctx: Context): Intersection | IncompleteFieldError {
  if(dataset.length == 0){
    return {keys: []}
  }
  let incompleteKeys : Set<string> = new Set()
  let keyIntersection : Set<string> = new Set(Object.keys(dataset[0]))
  for(let i = 1; i < dataset.length; i++){
    let otherKeys = new Set(Object.keys(dataset[i]))
    let currIntersection: string[] = [] 
    for(let key of otherKeys){
      if(keyIntersection.has(key)){
        currIntersection.push(key)
      }
      else{
        incompleteKeys.add(key)
      }
    }
    for(let key of keyIntersection){
      if(!otherKeys.has(key)){
        incompleteKeys.add(key)
      }
    }
    keyIntersection = new Set(currIntersection)
  }
  if(incompleteKeys.size > 0){
    return {
      type: "incompleteField",
      context: {
        datasetName: ctx.datasetName,
        indices: ctx.indices.slice()
      },
      incompleteKeys: [...incompleteKeys],
      completeKeys: [...keyIntersection]
    }
  }
  return {keys: [...keyIntersection]};
}

enum SimplifiedType {
  Object = "object",
  Array = "array",
  Primitive = "primitive"
}

function getSimplifiedType(v: any){
  if(isArray(v))
    return SimplifiedType.Array
  if(isObject(v))
    return SimplifiedType.Object
  else
    return SimplifiedType.Primitive
}

function getSimplifiedTypeForList(dataset: Dict) : SimplifiedType[] {
  let types = new Set(Object.values(dataset).map(v => getSimplifiedType(v)))
  return [...types]
}

function tryGetShape(dataset: Dict, ctx: Context): Shape | InconsistentDataError {
  let valTypes = getSimplifiedTypeForList(dataset)
  if(valTypes.length == 0){
    return {}
  }
  if(valTypes.length > 1){
    return {
      type: "mismatchedDatum",
      context: {
        datasetName: ctx.datasetName,
        indices: ctx.indices.slice()
      },
      possibleTypes: valTypes
    }
  }
  let valType = valTypes[0]
  switch(valType){
    case SimplifiedType.Primitive:
      return {}
    case SimplifiedType.Array:
      return handleArrayValues(dataset as any[][], ctx)
    case SimplifiedType.Object:
      return handleObjectValues(dataset, ctx)
  }
}

function isIncompleteError(val: any): val is IncompleteFieldError {
  return (val as IncompleteFieldError).type == "incompleteField"
}

function isMismatchedDatumError(val: any): val is MismatchedDatumError {
  return (val as MismatchedDatumError).type == "mismatchedDatum"
}

function isInconsistentDataError(val: any): val is InconsistentDataError {
  return isIncompleteError(val) || isMismatchedDatumError(val)
}

function handleObjectValues(dataset: Dict, ctx: Context): {[key: string]: Shape} | InconsistentDataError {
  let maybeKeys = getKeyIntersection(dataset, ctx)
  if(isIncompleteError(maybeKeys)){
    return maybeKeys;
  }
  let result: Shape = {}
  for(let key of maybeKeys.keys){
    ctx.indices.push(key)
    let out = tryGetShape(dataset.map((o: { [x: string]: any; }) => o[key]), ctx)
    ctx.indices.pop()
    if(isInconsistentDataError(out)){
      return out;
    }
    result[key] = out
  }
  return result
}

function handleArrayValues(dataset: any[][], ctx: Context): Shape[] | InconsistentDataError {
  let maxLen = Math.min(...dataset.flatMap(o => o.length))
  let result: Shape = []
  for(let i = 0; i < maxLen; i++){
    ctx.indices.push(i)
    let out = tryGetShape(dataset.map(o => o[i]), ctx)
    ctx.indices.pop()
    if(isInconsistentDataError(out)){
      return out;
    }
    result[i] = out
  }
  return result;
}

type Dict = {[index: Key]: any}

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

  outData = toArray(outData).map((val: any) => {
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

function checkPropIsPresentOnAllObjects(prop: string, data: Dict) {
  throw new Error('Function not implemented.');
}

loadDatasets(parsedSpec.data).then((outDatasets) => {
  for(let datasetName in outDatasets){
    //error(`Not all data objects in table ${ctx.datasetName}${ctx.indices.length > 0 ? "in field " + pathToString(ctx.indices) : ""} contain these fields: ${incompleteKeys}
//Available valid common fields are ${keyIntersection}`)
    console.log("parsing", datasetName + ":", outDatasets[datasetName])
    console.log(tryGetShape(outDatasets[datasetName], {datasetName: datasetName, indices: []}))
  }
})