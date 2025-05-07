import { failure, Result, Runtime } from "../types/commonTypes";
import { Shape } from "../shape-inference/types";
import { Transform } from "./transform";
import * as vega from 'vega'
import * as ErrorLogger from '../logging/errorLogger'
import { Expression } from 'estree';
import { inferOutputShape } from "../expressions/main";

export class FilterTransform {
    public type = 'filter'
    constructor(
        private expr: Expression
    ) {
      }
    transform(runtime: Runtime, inputShape: Shape): Result<Shape> {
        if(!inferOutputShape(runtime, this.expr, inputShape))
            return failure;
        return inputShape;
    }
    static fromSpec(runtime: Runtime, spec: {'type': string}): Result<Transform> {
        const filterSpec = spec as {
          'type': string,
          'expr': unknown
        }
        try {
            const expr = vega.parseExpression(filterSpec.expr as string)
            return new FilterTransform(expr)
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