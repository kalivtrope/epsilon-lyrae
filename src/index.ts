import * as fs from 'fs';
import { Path } from './commonTypes';
import { loadDatasets } from './data-loading/main'
import { tryGetShape } from './shape-inference/main';


export function pathToString(path: Path): string {
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

  
const rawSpec = fs.readFileSync(0, 'utf-8');
const parsedSpec = JSON.parse(rawSpec)

loadDatasets(parsedSpec.data).then((outDatasets) => {
  for(const datasetName in outDatasets){
    //error(`Not all data objects in table ${ctx.datasetName}${ctx.indices.length > 0 ? "in field " + pathToString(ctx.indices) : ""} contain these fields: ${incompleteKeys}
//Available valid common fields are ${keyIntersection}`)
    console.log("parsing", datasetName + ":", outDatasets[datasetName])
    console.log(tryGetShape(outDatasets[datasetName], {datasetName: datasetName, indices: []}))
  }
})