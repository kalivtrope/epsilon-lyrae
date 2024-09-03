import { toResult, failure, Field, isFailure, Result, getOutputField, isResultArray, } from "../commonTypes"
import { Shape } from "../shape-inference/types"
import { toPath, toShapeResultArray, Transform } from "./transform"
import * as ErrorLogger from "../logging/errorLogger"
import { zip } from "../jsTypes"
import { checkFieldArrayFormat, checkFieldFormat, checkStringArrayFormat } from "./formatChecking"
import { shapeAt } from "../lookup/main"
import { Scope } from "../scope"


export class AggregateTransform {
  public type = 'aggregate'
  transform(datasetName: string, scope: Scope): Result<Shape> {
    const groupbyShapes = toShapeResultArray(this.groupby, datasetName, scope)
    if(!isResultArray(groupbyShapes)){
      return failure
    }
    const fieldsShapes  = this.fields.length === 0 ? [[]] : toShapeResultArray(this.fields, datasetName, scope)
    if(!isResultArray(fieldsShapes)){
      return failure
    }
    if(this.key != undefined){
      const res = shapeAt(datasetName, toPath(this.key), scope)
      if(isFailure(res)){
        return failure
      }
    }
    if(this.ops.length !== fieldsShapes.length){
      return failure // vega already reports an error in this situation
    }
    while(this.as.length < fieldsShapes.length){
      if(this.fields.length === 0){
        // if there are no named fields, don't try to figure out their names
        // (and drop the underscore)
        this.as.push(`${this.ops[this.as.length]}`)
      }
      else{
        this.as.push(`${this.ops[this.as.length]}_${getOutputField(this.fields[this.as.length])}`)
      }
    }
    const out = zip(this.groupby.map(getOutputField), groupbyShapes).concat(
      zip(this.as, Array(this.as.length).fill({}))
    )
    
    // https://stackoverflow.com/questions/32002176/how-to-convert-an-array-of-key-value-tuples-into-an-object
    const outShape: Shape = Object.fromEntries(out)
    return outShape
    
  }
  constructor(
    private groupby: Field[],
    private fields: Field[],
    private ops: string[],
    private as: string[],
    private key: Field | undefined
  ) {
  }
}

export class TransformParser {
  fromSpec(spec: {'type': string}): Result<Transform> {
    switch(spec.type){
      case 'aggregate':
        { const aggSpec = spec as {
          'type': string,
          'groupby': unknown,
          'fields': unknown,
          'ops': unknown,
          'as': unknown,
          'key': unknown                 
          }   
        if(!checkFieldArrayFormat(aggSpec.groupby, "groupby")
        || !checkFieldArrayFormat(aggSpec.fields, "fields")
        || !checkStringArrayFormat(aggSpec.ops, "ops")
        || !checkStringArrayFormat(aggSpec.as, "as")
        || !checkFieldFormat(aggSpec.key, "key")){
          return failure;
        } 
        const groupby = aggSpec.groupby || []
        const _fields = (aggSpec.fields || [])
        if(!_fields.every(val => !isFailure(val))){
          return failure
        }
        const fields = _fields.map(toResult)
        const ops = (aggSpec.ops || ['count'])
        const as = aggSpec.as || []
        const key = aggSpec.key
        return new AggregateTransform(groupby, fields, ops, as, key);
      }
      // case 'stack':
        //return new StackTransform();
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