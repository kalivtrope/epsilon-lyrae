import {Dict, failure, Intersection, isFailure, Result, Runtime} from '../types/commonTypes'
import { Context, Shape, getSimplifiedTypeForList, stringPrimitive } from './types'
import * as ErrorLogger from '../logging/errorLogger'

function getKeyIntersection(runtime: Runtime, dataset: Dict[], ctx: Context): Result<Intersection> {
  if(dataset.length == 0){
    return {keys: []}
  }
  const incompleteKeys  = new Set<string>()
  let keyIntersection  = new Set<string>(Object.keys(dataset[0]))
  for(let i = 1; i < dataset.length; i++){
    const otherKeys = new Set(Object.keys(dataset[i]))
    const currIntersection: string[] = [] 
    for(const key of otherKeys){
      if(keyIntersection.has(key)){
        currIntersection.push(key)
      }
      else{
        incompleteKeys.add(key)
      }
    }
    for(const key of keyIntersection){
      if(!otherKeys.has(key)){
        incompleteKeys.add(key)
      }
    }
    keyIntersection = new Set(currIntersection)
  }
  if(incompleteKeys.size > 0){
    ErrorLogger.logError(
      {
        location: runtime.prefix,
        error: {
          type: "incompleteField",
          context: {
            datasetName: ctx.datasetName,
            indices: ctx.indices.slice()
          },
          incompleteKeys: [...incompleteKeys],
          completeKeys: [...keyIntersection]
        }
      }
    )
    return failure
  }
  return {keys: [...keyIntersection]};
}


function handleObjectValues(runtime: Runtime, dataset: Dict[], ctx: Context): Result<Record<string, Shape>> {
    const keys = getKeyIntersection(runtime, dataset, ctx)
    if(isFailure(keys))
      return failure
    const result: Shape = {}
    for(const key of keys.keys){
      ctx.indices.push(key)
      const out = inferDatasetShape(runtime, dataset.map((o: Record<string, unknown>) => o[key]), ctx)
      ctx.indices.pop()
      if(isFailure(out))
        return failure
      result[key] = out
    }
    return result
  }
  
  function handleArrayValues(runtime: Runtime, dataset: unknown[][], ctx: Context): Result<Shape[]> {
    const maxLen = Math.min(...dataset.flatMap(o => o.length))
    const result: Shape = []
    for(let i = 0; i < maxLen; i++){
      ctx.indices.push(i)
      const out = inferDatasetShape(runtime, dataset.map(o => o[i]), ctx)
      ctx.indices.pop()
      if(isFailure(out))
        return failure
      result[i] = out
    }
    return result;
  }

  
export function inferDatasetShape(runtime: Runtime, dataset: unknown, ctx: Context): Result<Shape> {
    const valTypes = getSimplifiedTypeForList(dataset as Dict)
    if(valTypes.length == 0){
      return stringPrimitive;
    }
    if(valTypes.length > 1){
      ErrorLogger.logError(
        {
          location: runtime.prefix,
          error: {
            type: "mismatchedDatum",
            possibleTypes: valTypes,
            context: {
              datasetName: ctx.datasetName,
              indices: ctx.indices.slice(),
            }
        }
      }
      )
      return failure
    }
    const valType = valTypes[0]
    switch(valType){
      case "array":
        return handleArrayValues(runtime, dataset as unknown[][], ctx)
      case "object":
        return handleObjectValues(runtime, dataset as Dict[], ctx)
      default:
        return valType;
      }
  }