import { InconsistentDataError } from "./shape-inference/error";
import { TransformError } from "./transforms/errors";
import { ParseError } from "./data-loading/error";
import { AccessError } from "./lookup/error";

export interface Error {
    location: string[],
    error: TransformError | ParseError | AccessError | InconsistentDataError
}