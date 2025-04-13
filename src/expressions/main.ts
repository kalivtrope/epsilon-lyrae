import { isArray, isNumber, isObject, isString, parseExpression } from "vega"
import {Expression, Identifier, Literal, PrivateIdentifier, Property, SpreadElement, Super} from "estree"
import { Context, failure, isFailure, Path, Result } from "../commonTypes"
import { Scope } from "../scope";
import { Primitive, Shape, isPrimitive, numberPrimitive, isNumberPrimitive, isStringPrimitive, stringPrimitive, booleanPrimitive, combinePrimitives } from "../shape-inference/types";
import * as ErrorLogger from '../logging/errorLogger'
import {generate} from "astring"

export class ExpressionContext {
    constants = ["E", "PI"]
    boolean_unary_functions = ["isBoolean", "isNumber", "isObject", "isString"]
    number_binary_functions = ["min", "max", "exp"]
    fieldvar = "datum"
    depth = 0
    prefix: Path = []
    datasetName: string
    scope: Scope
    pushKey(key: string){
        this.prefix.push(key)
    }
    popKey(){
        this.prefix.pop();
    }
    getDepth(){
        return this.depth;
    }
    isConstant(id: string){
        return this.constants.includes(id)
    }
    isSignal(id: string){
        return this.scope.signals.includes(id)
    }
    isUnaryFunction(id: string){
        return this.boolean_unary_functions.includes(id)
    }
    isBinaryFunction(id: string){
        return this.number_binary_functions.includes(id)
    }
    getOutputShape(id: string): Primitive {
        if(this.isUnaryFunction(id)){
            return booleanPrimitive;
        }
        else if(this.isBinaryFunction(id)){
            return numberPrimitive;
        }
        return stringPrimitive;
    }
    constructor(dataset_name: string, scope: Scope){
        this.datasetName = dataset_name
        this.scope = scope
    }
}
/*
export function* extractPathsFromString(expr: string, ctx: ExpressionContext): IterableIterator<Path>{
    yield* extractPathsFromExpression(parseExpression(expr), ctx, 0)
}*/

function objectIsExpression(obj: Expression | Super): obj is Expression {
    return obj.type != "Super";
}
function propertyIsExpression(prop: Expression | PrivateIdentifier): prop is Expression {
    return prop.type != "PrivateIdentifier";
}
function elementIsExpression(elem: Expression | SpreadElement | null): elem is Expression {
    return elem != null && elem.type != "SpreadElement";
}

function propertyIsIdentifier(prop: Expression | PrivateIdentifier): prop is Identifier {
    return prop.type == "Identifier";
}

function propertyIsLiteral(prop: Expression | PrivateIdentifier): prop is Literal {
    return prop.type == "Literal"
}

function calleeIsIdentifier(callee: Expression | Super): callee is Identifier {
    return callee.type == "Identifier"
}

function isProperty(property: Property | SpreadElement): property is Property {
    return property.type == "Property"
}

function canIndex(index: unknown): index is string | number {
    return isNumber(index) || isString(index)
}

function indexShape(shape: Shape, index: string | number, ctx: ExpressionContext, objExpr: Expression, indexExpr: Expression): Result<Shape> {
    if(isArray(shape)){
        if(!isNumber(index)){
            ErrorLogger.logError({
                location: ["TODO"], // TODO: scope, dataset "" definition, n-th transformation
                error: {
                    type: "stringIndexedArray",
                    datasetName: ctx.datasetName,
                    array: generate(objExpr),
                    index: index
                }
            })
            return failure;
        }
        if(!(0 <= index && index < shape.length)){
            ErrorLogger.logError({
                location: ["TODO"],
                error: {
                    type: "outOfBounds",
                    index: index,
                    datasetName: ctx.datasetName,
                    array: generate(objExpr),
                    length: shape.length
                }
            })
            return failure;
        }
        return shape[index];
    }
    if(isPrimitive(shape)){
        ErrorLogger.logError({
            location: ["TODO"],
            error: {
                type: "primitiveIndexError",
                index: index,
                datasetName: ctx.datasetName,
                primitive: generate(objExpr)
            }
        })
        return failure;
    }
    const out = shape[index.toString()]
    if(!out){
        ErrorLogger.logError({
            location: ["TODO"],
            error: {
                type: "nonexistentField",
                datasetName: ctx.datasetName,
                object: generate(objExpr),
                prefix: [],
                field: index.toString(),
                availableFields: Object.keys(shape)
            }
        })
        return failure;
    }
    return out;
}

function toPrimitive(shape: Shape): Primitive {
    if(isPrimitive(shape)){
        return shape;
    }
    return stringPrimitive;
}


function keyIntersection(lhs: object, rhs: object): string[] {
    return Object.keys(lhs).filter(key => rhs.hasOwnProperty(key))
}

function shapeIntersection(lhs: Shape, rhs: Shape): Shape {
    if(isPrimitive(lhs) || isPrimitive(rhs)){
        return combinePrimitives(toPrimitive(lhs), toPrimitive(rhs))
    }
    if(isArray(lhs) && isArray(rhs)){
        const outShape: Shape = []
        for(let i = 0; i < Math.min(lhs.length, rhs.length); i++){
            outShape[i] = shapeIntersection(lhs[i], rhs[i])
        }
        return outShape;
    }
    const outShape: Shape = {}
    for(const key of keyIntersection(lhs, rhs)){
        outShape[key] = shapeIntersection(
                (lhs as {[key: string]: Shape})[key],
                (rhs as {[key: string]: Shape})[key])
    }
    return outShape;
}

export function inferOutputShape(expr: Expression, ctx: ExpressionContext): Result<Shape>{
    console.log("got expr type", expr.type)
    switch(expr.type){
        case "MemberExpression":
            const object = expr.object;
            if(objectIsExpression(object)){
                const object_shape = inferOutputShape(object, ctx)
                if(isFailure(object_shape))
                    return failure
                const property = expr.property;
                if(propertyIsIdentifier(property)){
                   return indexShape(object_shape, property.name, ctx, object, property)
                }
                else if(propertyIsLiteral(property) && canIndex(property.value)){
                    return indexShape(object_shape, property.value, ctx, object, property)
                }
                ErrorLogger.logError({
                    location: ["TODO"],
                    error: {
                        type: 'unsupportedIndex',
                        index: generate(property)
                    }
                })
            }
            else {
                ErrorLogger.logError({
                    location: ["TODO"],
                    error: {
                        type: 'unsupportedObject',
                        index: generate(object)
                    }
                }) 
            }
            return failure;
        case "ArrayExpression":
            const arrRes: Shape = []
            for(const [i, elem] of expr.elements.entries()){
                if(elementIsExpression(elem)){
                    const out = inferOutputShape(elem, ctx);
                    if(isFailure(out)){
                        return failure;
                    }
                    arrRes[i] = out;
                }
            }
            return arrRes;
        case "Identifier":
            const name = expr.name;
            if(name == ctx.fieldvar){
                const shape = ctx.scope.datasets[ctx.datasetName] // TODO: proper lookup
                if(!shape){
                    ErrorLogger.logError({
                        location: ["TODO"],
                        error: {
                            type: "nonexistentDataset",
                            datasetName: ctx.datasetName,
                            availableTables: Object.keys(ctx.scope.datasets)
                        }
                    }) 
                    return failure;
                }
                return shape;
            }
            if(ctx.isConstant(name) || ctx.isSignal(name)){
                return numberPrimitive;
            }
            return failure; // vega already reports an unknown identifier error in this case
        case "Literal":
            switch(typeof expr.value){
                case "number": return numberPrimitive;
                case "boolean": return booleanPrimitive;
                default:
                    return stringPrimitive;
            }
        case "CallExpression":
            const callee = expr.callee
            const args = expr.arguments.map(arg => inferOutputShape(arg as Expression, ctx))
            if(args.some(arg => isFailure(arg))){
                return failure;
            }
            if(calleeIsIdentifier(callee)){
                if((expr.arguments.length == 1 && ctx.isUnaryFunction(callee.name))
                || (expr.arguments.length == 2 && ctx.isBinaryFunction(callee.name))) {
                    return ctx.getOutputShape(callee.name)
                }
                else{
                    ErrorLogger.logError(
                        {
                            location: ["TODO"],
                            error: {
                                type: "invalidCall",
                                callee: generate(callee),
                                arguments: expr.arguments.map(arg => generate(arg)),
                                argumentTypes: args
                            }
                        }
                    )
                    return failure;
                }
            }
            ErrorLogger.logError(
                {
                    location: ["TODO"],
                    error: {
                        type: "notAFunction",
                        identifier: generate(callee)
                    }
                }
            )
            return failure;
        case "BinaryExpression":
            const op = expr.operator;
            const lhs = inferOutputShape(expr.left, ctx);
            const rhs = inferOutputShape(expr.right, ctx);
            if(isFailure(lhs) || isFailure(rhs)){
                return failure;
            }
            if(!isPrimitive(lhs) || !isPrimitive(rhs)){
                // currently supported operations operate only on primitives
                ErrorLogger.logError(
                    {
                        location: ["TODO"],
                        error: {
                            type: "invalidOperands",
                            operation: op,
                            operands: [generate(expr.left), generate(expr.right)],
                            operandTypes: [lhs, rhs]
                        }
                    }
                )
                return failure;
            }
            switch(op){
                case "+":
                    if(isStringPrimitive(lhs) || isStringPrimitive(rhs)){
                        return stringPrimitive;
                    }
                    return numberPrimitive;
                case "-":
                case "*":
                case "/":
                    if(isNumberPrimitive(lhs) && isNumberPrimitive(rhs)){
                        return numberPrimitive;
                    }
                    ErrorLogger.logError(
                        {
                            location: ["TODO"],
                            error: {
                                type: "invalidOperands",
                                operation: op,
                                operands: [generate(expr.left), generate(expr.right)],
                                operandTypes: [lhs, rhs]
                            }
                        }
                    )
                    return failure;
                case "<":
                case ">":
                case "<=":
                case ">=":
                    return booleanPrimitive;
                default:
                    ErrorLogger.logError(
                        {
                            location: ["TODO"],
                            error: {
                                type: "unsupportedOperation",
                                operation: op
                            }
                        }
                    )
                    return failure;
                /*
                case "==":
                case "!=":
                case "===":
                case "!==":
                case "<":
                case "<=":
                case ">":
                case ">=":
                case "<<":
                case ">>":
                case ">>>":
                
                case "%":
                case "**":
                case "|":
                case "^":
                case "&":
                case "in":
                case "instanceof":
                */
            }
        case "ConditionalExpression":
            const consequent = inferOutputShape(expr.consequent, ctx)
            const alternate = inferOutputShape(expr.alternate, ctx)
            if(isFailure(consequent) || isFailure(alternate))
                return failure;
            return shapeIntersection(consequent, alternate);
        case "LogicalExpression":
            const _lhs = inferOutputShape(expr.left, ctx)
            const _rhs = inferOutputShape(expr.right, ctx)
            if(isFailure(_lhs) || isFailure(_rhs))
                return failure;
            return shapeIntersection(_lhs, _rhs)
        case "ObjectExpression":
            const properties = expr.properties
            const res: Shape = {}
            for(const property of properties){
                if(isProperty(property)){
                    const key = property.key
                    let resKey: string;
                    if(propertyIsIdentifier(key)){
                        resKey = key.name
                    }
                    else if(propertyIsLiteral(key) && canIndex(key.value)){
                        resKey = key.value?.toString()
                    }
                    else {
                        ErrorLogger.logError(
                            {
                                location: ["TODO"],
                                error: {
                                    type: "unsupportedKey",
                                    key: generate(key)
                                }
                            }
                        )
                        return failure;
                    }
                    const value = property.value
                    const resVal = inferOutputShape(value as Expression, ctx)
                    if(isFailure(resVal)){
                        return resVal;
                    }
                    res[resKey] = resVal;
                }
            }
            return res;
        default:
            ErrorLogger.logError(
                {
                    location: ["TODO"],
                    error: {
                        type: "unsupportedExpression",
                        exprType: expr.type,
                        expr: expr
                    }
                }
            )
            return failure;
        /*case "ArrowFunctionExpression":
        case "AssignmentExpression":
        case "AwaitExpression":
        case "ChainExpression":
        case "ClassExpression":
        case "FunctionExpression":
        case "ImportExpression":
        case "MetaProperty":
        case "NewExpression":
        case "SequenceExpression":
        case "TaggedTemplateExpression":
        case "TemplateLiteral":
        case "ThisExpression":
        case "UnaryExpression":
        case "UpdateExpression":
        case "YieldExpression":*/
    }
}


