import {Dict, Intersection} from '../commonTypes'
import { IncompleteFieldError, InconsistentDataError, isIncompleteError, isInconsistentDataError } from './error'
import { Context, Shape, SimplifiedType, getSimplifiedTypeForList } from './types'

function getKeyIntersection(dataset: Dict[], ctx: Context): Intersection | IncompleteFieldError {
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


function handleObjectValues(dataset: Dict[], ctx: Context): Record<string, Shape> | InconsistentDataError {
    const maybeKeys = getKeyIntersection(dataset, ctx)
    if(isIncompleteError(maybeKeys)){
      return maybeKeys;
    }
    const result: Shape = {}
    for(const key of maybeKeys.keys){
      ctx.indices.push(key)
      const out = tryGetShape(dataset.map((o: Record<string, unknown>) => o[key]), ctx)
      ctx.indices.pop()
      if(isInconsistentDataError(out)){
        return out;
      }
      result[key] = out
    }
    return result
  }
  
  function handleArrayValues(dataset: unknown[][], ctx: Context): Shape[] | InconsistentDataError {
    const maxLen = Math.min(...dataset.flatMap(o => o.length))
    const result: Shape = []
    for(let i = 0; i < maxLen; i++){
      ctx.indices.push(i)
      const out = tryGetShape(dataset.map(o => o[i]), ctx)
      ctx.indices.pop()
      if(isInconsistentDataError(out)){
        return out;
      }
      result[i] = out
    }
    return result;
  }

  
export function tryGetShape(dataset: unknown, ctx: Context): Shape | InconsistentDataError {
    const valTypes = getSimplifiedTypeForList(dataset as Dict)
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
    const valType = valTypes[0]
    switch(valType){
      case SimplifiedType.Primitive:
        return {}
      case SimplifiedType.Array:
        return handleArrayValues(dataset as unknown[][], ctx)
      case SimplifiedType.Object:
        return handleObjectValues(dataset as Dict[], ctx)
    }
  }