import * as fs from 'fs';
import { Dict, failure, isFailure } from './commonTypes';
import { loadDataset } from './data-loading/main'
import { toArray } from './jsTypes';
import { getDatasetShape } from './shape-inference/main';
import { TransformParser } from './transforms/Aggregate';
import { Scope } from 'scope';

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
  datasets: {}
}

async function main(){
  for(const _dataset of toArray(parsedSpec.data)){
    const dataset = _dataset as Record<string, unknown>
    const datasetName = dataset.name as string
    await loadDataset(dataset, outDatasets)
    const shape = getDatasetShape(outDatasets[datasetName], {datasetName: datasetName, indices: []})
    if(isFailure(shape))
      return failure
    scope.datasets[datasetName] = shape
    if(dataset.transform){
      const transforms = toArray(dataset.transform)
      const transformParser = new TransformParser()
      for(const _transform of transforms){
        const transform = transformParser.fromSpec(_transform as {"type": string})
        if(isFailure(transform)){
          continue
        }
        const out = transform.transform(datasetName, scope)
        if(isFailure(out))
          continue
        scope.datasets[datasetName] = out
      }
    }
  }
}

main()