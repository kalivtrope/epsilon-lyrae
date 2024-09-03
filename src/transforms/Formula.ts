import { Shape } from "../shape-inference/types";
import { failure, isFailure, Result } from "../commonTypes";
import { Scope } from "../scope";
import {Expression} from "estree"
import * as vega from 'vega'
import * as ErrorLogger from '../logging/errorLogger'
import { lookupDataset } from "../lookup/main";
import { Transform } from "./transform";
import { checkStringFormat } from "./formatChecking";

export class FormulaTransform {
    public type = 'formula'
    constructor(
        private expr: Expression,
        private as: string
    ) {
      }
    transform(datasetName: string, scope: Scope): Result<Shape> {
        const shape = lookupDataset(datasetName, scope)
        // TODO: check expr
        if(isFailure(shape))
            return failure
        // TODO: infer shape of expr
        return Object.assign({}, shape, {[this.as]: {}})
    }
    static fromSpec(spec: {'type': string}): Result<Transform> {
        const filterSpec = spec as {
            'type': string,
            'expr': unknown,
            'as': string
        }
        if(!checkStringFormat(filterSpec.as, "as", true)){
            return failure
        }
        try {
            const expr = vega.parseExpression(filterSpec.expr as string)
            return new FormulaTransform(expr, filterSpec.as)
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