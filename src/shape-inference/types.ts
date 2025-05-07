import { isArray, isObject } from '../types/jsTypes'
import {Dict, Path} from '../types/commonTypes'
import { isBoolean, isNumber, isString } from 'vega'

/* Main logic for shape inference and shape intersection. */


export const objectType = "object"
export const arrayType = "array"
export const booleanPrimitive = "boolean" 
export const numberPrimitive = "number"
export const stringPrimitive = "string"


export function isBooleanPrimitive(val: unknown): val is typeof booleanPrimitive {
  return val === booleanPrimitive
}

export function isNumberPrimitive(val: unknown): val is typeof numberPrimitive {
  return val === numberPrimitive;
}

export function isStringPrimitive(val: unknown): val is typeof stringPrimitive {
  return val == stringPrimitive;
}

export function isPrimitive(val: unknown): val is Primitive {
  return isBooleanPrimitive(val) || isNumberPrimitive(val) || isStringPrimitive(val);
}

export type Primitive = typeof booleanPrimitive | typeof numberPrimitive | typeof stringPrimitive
export type Shape = {[key: string]: Shape} | Shape[] | Primitive

export type SimplifiedType = typeof objectType | typeof arrayType | Primitive
  
export function getSimplifiedType(v: unknown): SimplifiedType {
    if(isArray(v))
      return arrayType
    if(isObject(v))
      return objectType
    if(v == null || isNumber(v))
      return numberPrimitive
    if(isBoolean(v))
      return booleanPrimitive
    return stringPrimitive
}


export function combinePrimitives(lhs: Primitive, rhs: Primitive): Primitive {
  if(lhs != rhs)
      return stringPrimitive;
  return lhs;
}

function primitiveIntersection(list: SimplifiedType[]){
  let primitives = list.filter(p => isPrimitive(p));
  const rest: SimplifiedType[] = list.filter(p => !isPrimitive(p))
  if(primitives.length > 0){
    let top = primitives.reduce((acc, curr) => combinePrimitives(acc, curr))
    rest.push(top)
  }
  return rest;
}
  
export function getSimplifiedTypeForList(dataset: Dict) : SimplifiedType[] {
    const types = new Set(Object.values(dataset).map(v => getSimplifiedType(v)))
    return primitiveIntersection([...types])
}

export interface Context {
  datasetName : string,
  indices: Path
}
