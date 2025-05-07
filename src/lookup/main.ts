import { failure, isFailure, Key, Path, Result, Runtime, Scope } from "../types/commonTypes";
import { Shape } from "../shape-inference/types";
import * as ErrorLogger from '../logging/errorLogger'
import { isArray, isObject } from "../types/jsTypes";

/* Main logic for querying the shape of datasets and for accessing shapes at paths */

function getAvailableDatasets(scope: Scope | undefined): string[]{
    const res = new Set<string>()
    while(scope != undefined){
      Object.keys(scope.datasets).forEach(dataset => {
        res.add(dataset)
      });
    }
    return Array.from(res)
}
  
export function lookupDataset(runtime: Runtime, datasetName: string, scope: Scope | undefined): Result<Shape>{
    const originalScope = scope;
    while(scope != undefined){
      if(scope.datasets[datasetName] != undefined){
        return scope.datasets[datasetName]
      }
      scope = scope.parent
    }
    ErrorLogger.logError({
      location: runtime.prefix,
      error: {
        type: 'nonexistentDataset',
        datasetName: datasetName,
        availableTables: getAvailableDatasets(originalScope)
      }
    })
    return failure
  }
  
  export function getEntry(shape: Shape, field: Key): Shape | undefined {
    if(isArray(shape) && typeof field === 'number')
      return shape[field]
    if(isObject(shape))
      return shape[field]
}

export function getEntryAtPath(shape: Shape | undefined, path: Path): Shape | undefined {
  for(const p of path){
    if(!shape)
      return undefined;
    shape = getEntry(shape, p)
  }
  return shape;
}
  
function lookupFieldPath(runtime: Runtime, dataset: Shape, datasetName: string, path: Path): Result<Shape> {
    for(let i = 0; i < path.length; i++){
      const field = path[i]
      const entry = getEntry(dataset, field)
      if(!entry){
        ErrorLogger.logError( {
          location: runtime.prefix,
          error: {
            type: 'nonexistentField',
            datasetName: datasetName,
            field: field.toString(),
            prefix: path.slice(0, i),
            availableFields: Object.keys(dataset)
          }
        })
        return failure
      }
      dataset = entry
    }
    return dataset
}
  
export function shapeAt(runtime: Runtime, datasetName: string, path: Path, scope: Scope): Result<Shape> {
    const dataset = lookupDataset(runtime, datasetName, scope)
    if(isFailure(dataset))
      return failure
    const field = lookupFieldPath(runtime, dataset, datasetName, path)
    if(isFailure(field))
      return failure
    return field
}
  