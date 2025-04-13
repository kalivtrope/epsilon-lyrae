import {Context, SimplifiedType} from './types'
 
interface MismatchedDatumError {
    type: "mismatchedDatum"
    context: Context,
    possibleTypes: SimplifiedType[]
  }  

interface IncompleteFieldError {
    type: "incompleteField",
    context: Context,
    incompleteKeys: string[],
    completeKeys: string[]
  }
  
type InconsistentDataError = IncompleteFieldError | MismatchedDatumError
  
function isIncompleteError(val: unknown): val is IncompleteFieldError {
  return (val as IncompleteFieldError).type == "incompleteField"
}

function isMismatchedDatumError(val: unknown): val is MismatchedDatumError {
  return (val as MismatchedDatumError).type == "mismatchedDatum"
}

function isInconsistentDataError(val: unknown): val is InconsistentDataError {
  return isIncompleteError(val) || isMismatchedDatumError(val)
}

export {
  MismatchedDatumError,
  IncompleteFieldError,
  InconsistentDataError,
  isIncompleteError,
  isMismatchedDatumError,
  isInconsistentDataError
}