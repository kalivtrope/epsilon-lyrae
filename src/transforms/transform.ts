import { parseField } from "../fieldParsing";
import { failure, Field, getInputField, Path, Result, toResult } from "../commonTypes";
import { getEntryAtPath, shapeAt } from "../lookup/main";
import { Scope } from "../scope";
import { Shape } from "../shape-inference/types";
import * as ErrorLogger from "../logging/errorLogger"
import { AggregateTransform } from "./Aggregate";
import { FilterTransform } from "./Filter";
import { FormulaTransform } from "./Formula";
import { Runtime } from "../index";


export function toPath(val: Field): Path {
    return toResult(parseField(getInputField(val)))
  }
export function toPathArray(vals: Field[]): Path[]{
    return vals.map(toPath)
  }
  
export function toShapeResultArray(runtime: Runtime, vals: Field[], inputShape: Shape): Result<Shape>[] {
    return toPathArray(vals).map(path => {
      const out = getEntryAtPath(inputShape, path);
      if(!out){
        ErrorLogger.logError({
          location: runtime.prefix,
          error: {
            type: "nonexistentField",
            prefix: ["TBD"],
            datasetName: "TBD",
            availableFields: ["TBD"],
            field: "TBD"
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
        return AggregateTransform.fromSpec(spec)
      case 'filter':
        return FilterTransform.fromSpec(spec)
      case 'formula':
        return FormulaTransform.fromSpec(spec)
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