import { Path } from "../types/commonTypes";

export type ExpressionError = UnsupportedOperationError | UnknownFunctionError | UnsupportedIndexError | UnsupportedObjectError | UnsupportedExpressionError
            | PrimitiveIndexError | InvalidOperands | InvalidCallError | NotAFunctionError | UnsupportedKeyError;

export interface UnsupportedOperationError {
    type: "unsupportedOperation",
    operation: unknown
}

export interface InvalidOperands {
    type: "invalidOperands",
    operation: unknown,
    operands: unknown[],
    operandTypes: unknown[]
}

export interface InvalidCallError {
    type: "invalidCall",
    callee: unknown,
    arguments: unknown[],
    argumentTypes: unknown[]
}
export interface NotAFunctionError {
    type: "notAFunction",
    identifier: unknown
}
export interface UnknownFunctionError {
    type: "unknownFunction",
    function: unknown
}

export interface UnsupportedIndexError {
    type: "unsupportedIndex",
    index: unknown
}

export interface UnsupportedKeyError {
    type: "unsupportedKey",
    key: unknown
}

export interface UnsupportedObjectError {
    type: "unsupportedObject",
    index: unknown
}

export interface UnsupportedExpressionError {
    type: "unsupportedExpression",
    exprType: string,
    expr: unknown
}

export interface PrimitiveIndexError {
    type: "primitiveIndexError",
    index: unknown,
    datasetName: string
    primitive: string
}