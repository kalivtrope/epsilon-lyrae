import { Scope } from "../scope";
import { failure, Result } from "../commonTypes";
import { Shape } from "../shape-inference/types";
import { Transform } from "./transform";
import * as vega from 'vega'
import * as ErrorLogger from '../logging/errorLogger'
import { Expression } from 'estree';
import { lookupDataset } from "../lookup/main";
import { inferOutputShape } from "../expressions/main";
import { Runtime } from "../index";

export class FilterTransform {
    public type = 'filter'
    constructor(
        private expr: Expression
    ) {
      }
    transform(runtime: Runtime, inputShape: Shape): Result<Shape> {
        // TODO: extract field access from expr
        if(!inferOutputShape(runtime, this.expr, inputShape))
            return failure;
        return inputShape;
        //return lookupDataset(datasetName, scope)
    }
    static fromSpec(spec: {'type': string}): Result<Transform> {
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
                location: ["TODO"],
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