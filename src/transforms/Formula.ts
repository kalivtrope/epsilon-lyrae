import { Shape } from "../shape-inference/types";
import { failure, isFailure, Result, Runtime } from "../types/commonTypes";
import {Expression} from "estree"
import * as vega from 'vega'
import * as ErrorLogger from '../logging/errorLogger'
import { Transform } from "./transform";
import { checkStringFormat } from "./formatChecking";
import { inferOutputShape } from "../expressions/main";

export class FormulaTransform {
    public type = 'formula'
    constructor(
        private expr: Expression,
        private as: string
    ) {
      }
    transform(runtime: Runtime, inputShape: Shape): Result<Shape> {
        const outputShape = inferOutputShape(runtime, this.expr, inputShape)
        if(isFailure(outputShape))
            return failure
        return Object.assign({}, inputShape, {[this.as]: outputShape})
    }
    static fromSpec(runtime: Runtime, spec: {'type': string}): Result<Transform> {
        const filterSpec = spec as {
            'type': string,
            'expr': unknown,
            'as': string
        }
        if(!checkStringFormat(runtime, filterSpec.as, "as", true)){
            return failure
        }
        try {
            const expr = vega.parseExpression(filterSpec.expr as string)
            return new FormulaTransform(expr, filterSpec.as)
        }
        catch(e){
            ErrorLogger.logError({
                location: runtime.prefix,
                error: {
                    type: "invalidField",
                    reason: e as string,
                    field: 'expr'
                }
            })
            return failure
        }
    } 
}