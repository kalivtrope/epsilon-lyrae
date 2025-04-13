import * as fs from 'fs';
import { Dict, failure, isFailure } from './commonTypes';
import { loadDataset } from './data-loading/main'
import { toArray } from './jsTypes';
import { getDatasetShape } from './shape-inference/main';
import { Scope } from 'scope';
import { TransformParser } from './transforms/transform';
import { ExpressionContext, inferOutputShape } from './expressions/main';




/*
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
*/
  
const rawSpec = fs.readFileSync(0, 'utf-8');
const parsedSpec = JSON.parse(rawSpec)

const outDatasets: Dict = {}
const scope: Scope = {
  parent: undefined,
  datasets: {},
  signals: []
}

async function main(){
  for(const _signal of toArray(parsedSpec.signals)){
    const name = (_signal as {"name": string | undefined}).name
    if(name){
      scope.signals.push(name);
    }
  }
  for(const _dataset of toArray(parsedSpec.data)){
    const dataset = _dataset as Record<string, unknown>
    const datasetName = dataset.name as string
    console.log("started processing", datasetName)
    await loadDataset(dataset, outDatasets)
    const shape = getDatasetShape(outDatasets[datasetName], {datasetName: datasetName, indices: []})
    if(isFailure(shape))
      return failure
    scope.datasets[datasetName] = shape
    if(datasetName == "layer_indices"){
      //const expr = parseExpression("datum.data * height");
      const expr = parseExpression("{\"key\": datum.data + 9}");
      const inferredShape = inferOutputShape(expr, new ExpressionContext("layer_indices", scope))
      console.log(inferredShape)
    }
    if(dataset.transform){
      const transforms = toArray(dataset.transform)
      const transformParser = new TransformParser()
      for(const _transform of transforms){
        console.log("got transform", _transform)
        const transform = transformParser.fromSpec(_transform as {"type": string})
        if(isFailure(transform)){
          console.log('skipping')
          continue
        }
        const out = transform.transform(datasetName, scope)
        if(isFailure(out))
          continue
        scope.datasets[datasetName] = out
        console.log("transformed", out)
      }
    }
    console.log("dataset `" + datasetName + "` has shape", scope.datasets[datasetName])
  }
  
}

main()