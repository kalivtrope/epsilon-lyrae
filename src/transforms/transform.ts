import { parseField } from "../fieldParsing";
import { failure, Field, getInputField, Path, Result, toResult } from "../commonTypes";
import { shapeAt } from "../lookup/main";
import { Scope } from "../scope";
import { Shape } from "../shape-inference/types";
import * as ErrorLogger from "../logging/errorLogger"
import { AggregateTransform } from "./Aggregate";
import { FilterTransform } from "./Filter";
import { FormulaTransform } from "./Formula";


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
export type Transform = AggregateTransform | FilterTransform | FormulaTransform


export class TransformParser {
  fromSpec(spec: {'type': string}): Result<Transform> {
    switch(spec.type){
      case 'aggregate':
        return AggregateTransform.fromSpec(spec)
      case 'filter':
        return FilterTransform.fromSpec(spec)
      case 'formula':
        return FormulaTransform.fromSpec(spec)
      default:
        ErrorLogger.logError({
          location: ["TODO"],
          error: {
            type: "unknownTransform",
            name: spec.type
          }
        })
        return failure
    }
  }
}