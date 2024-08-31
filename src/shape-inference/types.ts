import { isArray, isObject } from '../jsTypes'
import {Dict, Path} from '../commonTypes'

export type Shape = {[key: string]: Shape} | Shape[]

export enum SimplifiedType {
    Object = "object",
    Array = "array",
    Primitive = "primitive"
  }
  
export function getSimplifiedType(v: unknown): SimplifiedType {
    if(isArray(v))
      return SimplifiedType.Array
    if(isObject(v))
      return SimplifiedType.Object
    else
      return SimplifiedType.Primitive
}
  
export function getSimplifiedTypeForList(dataset: Dict) : SimplifiedType[] {
    const types = new Set(Object.values(dataset).map(v => getSimplifiedType(v)))
    return [...types]
}

export interface Context {
  datasetName : string,
  indices: Path
}
