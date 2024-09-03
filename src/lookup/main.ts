import { failure, isFailure, Key, Path, Result } from "../commonTypes";
import { Shape } from "../shape-inference/types";
import * as ErrorLogger from '../logging/errorLogger'
import { isArray, isObject } from "../jsTypes";
import { Scope } from "scope";

function getAvailableDatasets(scope: Scope | undefined): string[]{
    const res = new Set<string>()
    while(scope != undefined){
      Object.keys(scope.datasets).forEach(dataset => {
        res.add(dataset)
      });
    }
    return Array.from(res)
}
  
export function lookupDataset(datasetName: string, scope: Scope | undefined): Result<Shape>{
    const originalScope = scope;
    while(scope != undefined){
      if(scope.datasets[datasetName] != undefined){
        return scope.datasets[datasetName]
      }
      scope = scope.parent
    }
    ErrorLogger.logError({
      location: ["TODO"],
      error: {
        type: 'nonexistentDataset',
        datasetName: datasetName,
        availableTables: getAvailableDatasets(originalScope)
      }
    })
    return failure
  }
  
  export function getEntry(dataset: Shape, field: Key): Shape | undefined {
    if(isArray(dataset) && typeof field === 'number')
      return dataset[field]
    if(isObject(dataset))
      return dataset[field]
}
  
function lookupFieldPath(dataset: Shape, datasetName: string, path: Path): Result<Shape> {
    for(let i = 0; i < path.length; i++){
      const field = path[i]
      const entry = getEntry(dataset, field)
      if(!entry){
        ErrorLogger.logError( {
          location: ["TODO"],
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
  
export function shapeAt(datasetName: string, path: Path, scope: Scope): Result<Shape> {
    const dataset = lookupDataset(datasetName, scope)
    if(isFailure(dataset))
      return failure
    const field = lookupFieldPath(dataset, datasetName, path)
    if(isFailure(field))
      return failure
    return field
}
  