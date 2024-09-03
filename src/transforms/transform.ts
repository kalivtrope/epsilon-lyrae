import { parseField } from "../fieldParsing";
import { Field, getInputField, Path, Result, toResult } from "../commonTypes";
import { AggregateTransform } from "./Aggregate";
import { shapeAt } from "../lookup/main";
import { Scope } from "../scope";
import { Shape } from "../shape-inference/types";


export function toPath(val: Field): Path {
    return toResult(parseField(getInputField(val)))
  }
export function toPathArray(vals: Field[]): Path[]{
    return vals.map(toPath)
  }
  
export function toShapeResultArray(vals: Field[], datasetName: string, scope: Scope): Result<Shape>[] {
    return toPathArray(vals).map(path => shapeAt(datasetName, path, scope)) 
  }

export type TransformResult = Result<Transform>
export type Transform = AggregateTransform
