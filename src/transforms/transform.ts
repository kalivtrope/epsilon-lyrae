import { parseField } from "../field-parsing/main";
import { failure, Field, getInputField, Path, Result, Runtime, toResult } from "../types/commonTypes";
import { getEntryAtPath, shapeAt } from "../lookup/main";
import { Shape } from "../shape-inference/types";
import * as ErrorLogger from "../logging/errorLogger"
import { AggregateTransform } from "./Aggregate";
import { FilterTransform } from "./Filter";
import { FormulaTransform } from "./Formula";


export function toPath(runtime: Runtime, val: Field): Path {
    return toResult(parseField(runtime, getInputField(val)))
  }
export function toPathArray(runtime: Runtime, vals: Field[]): Path[]{
    return vals.map(val => toPath(runtime, val))
  }
  
export function toShapeResultArray(runtime: Runtime, vals: Field[], inputShape: Shape): Result<Shape>[] {
    return toPathArray(runtime, vals).map(path => {
      const out = getEntryAtPath(inputShape, path);
      if(!out){
        // console.log("getEntryAtPath", inputShape, path);
        ErrorLogger.logError({
          location: runtime.prefix,
          error: {
            type: "nonexistentField",
            datasetName: runtime.currDatasetName!,
            field: path.toString()
          }
        });
        return failure;
      }
      return out;})  
  }

export type TransformResult = Result<Transform>
export type Transform = AggregateTransform | FilterTransform | FormulaTransform


export class TransformParser {
  fromSpec(runtime: Runtime, spec: {'type': string}): Result<Transform> {
    switch(spec.type){
      case 'aggregate':
        return AggregateTransform.fromSpec(runtime, spec)
      case 'filter':
        return FilterTransform.fromSpec(runtime, spec)
      case 'formula':
        return FormulaTransform.fromSpec(runtime, spec)
      default:
        ErrorLogger.logError({
          location: runtime.prefix,
          error: {
            type: "unknownTransform",
            name: spec.type
          }
        })
        return failure
    }
  }
}
