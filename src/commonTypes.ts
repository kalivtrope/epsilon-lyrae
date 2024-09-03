import { isArray, isObject } from "./jsTypes";

export type Dict = Record<Key, unknown>;

export type Key = string | number
export type Path = Key[]

export type Field = string | {"field": string, "as": string | undefined }

export function isField(val: unknown): val is Field {
    return typeof val === 'string' || (isObject(val) && typeof ((val as {"field": unknown}).field) === 'string') 
}

export function isStringArray(val: unknown): val is string[]{
    return isArray(val) && val.every(f => typeof f === 'string')
}
export function isFieldArray(val: unknown): val is Field[]{
    return isArray(val) && val.every(f => isField(f))
}
  

export function getInputField(field: Field): string {
    if(typeof field === 'string'){
        return field
    }
    return field.field
}

export function getOutputField(field: Field): string {
    if(typeof field === 'string'){
        return field
    }
    return field.as || field.field
}

export interface Intersection {
    keys: string[]
}

export interface Context {
    datasetName : string,
    indices: Path
}


interface Failure {
    type: 'failure'
}

export function isFailure(val: unknown): val is Failure {
    return (val as Failure).type === 'failure'
}
export const failure: Failure = {
    type: 'failure'
}

export function isResultArray<T>(val: Result<T>[]): val is T[]{
    return val.every(v => !isFailure(v))
}

export function toResult<T>(val: Result<T>): T {
    if(!isFailure(val)){
        return val
    }
    throw new Error("Trying to extract Result from Failure")
}

export type Result<T> = T | Failure