import { InconsistentDataError } from "../shape-inference/error";
import { TransformError } from "../transforms/errors";
import { ParseError } from "../data-loading/error";
import { AccessError } from "../lookup/error";
import { ExpressionError } from "../expressions/error";

export interface Error {
    location: (string | number)[],
    error: TransformError | ParseError | AccessError | InconsistentDataError | ExpressionError
}