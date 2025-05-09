import { toResult, failure, Field, isFailure, Result, getOutputField, isResultArray, Runtime, } from "../types/commonTypes"
import { numberPrimitive, Shape } from "../shape-inference/types"
import { toPath, toShapeResultArray, Transform } from "./transform"
import { zip } from "../types/jsTypes"
import { checkFieldArrayFormat, checkFieldFormat, checkStringArrayFormat } from "./formatChecking"
import { getEntryAtPath } from "../lookup/main"


export class AggregateTransform {
  public type = 'aggregate'
  transform(runtime: Runtime, inputShape: Shape): Result<Shape> {
    const groupbyShapes = toShapeResultArray(runtime, this.groupby, inputShape)
    if(!isResultArray(groupbyShapes)){
      return failure
    }
    const fieldsShapes  = this.fields.length === 0 ? [[]] : toShapeResultArray(runtime, this.fields, inputShape)
    if(!isResultArray(fieldsShapes)){
      return failure
    }
    if(this.key != undefined){
      const res = getEntryAtPath(inputShape, toPath(runtime, this.key))
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
      zip(this.as, Array(this.as.length).fill(numberPrimitive))
    )
    
    // https://stackoverflow.com/questions/32002176/how-to-convert-an-array-of-key-value-tuples-into-an-object
    const outShape: Shape = Object.fromEntries(out)
    return outShape
  }
  constructor(
    private runtime: Runtime,
    private groupby: Field[],
    private fields: Field[],
    private ops: string[],
    private as: string[],
    private key: Field | undefined
  ) {
  }
  static fromSpec(runtime: Runtime, spec: {'type': string}): Result<Transform> {
    const aggSpec = spec as {
      'type': string,
      'groupby': unknown,
      'fields': unknown,
      'ops': unknown,
      'as': unknown,
      'key': unknown
      }   
    if(!checkFieldArrayFormat(runtime, aggSpec.groupby, "groupby")
    || !checkFieldArrayFormat(runtime, aggSpec.fields, "fields")
    || !checkStringArrayFormat(runtime, aggSpec.ops, "ops")
    || !checkStringArrayFormat(runtime, aggSpec.as, "as")
    || !checkFieldFormat(runtime, aggSpec.key, "key")){
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
    return new AggregateTransform(runtime, groupby, fields, ops, as, key);
  }
}
