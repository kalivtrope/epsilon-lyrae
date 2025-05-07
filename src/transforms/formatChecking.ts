import { Field, getInputField, isFailure, isField, isFieldArray, isStringArray, Runtime } from "../types/commonTypes"
import * as ErrorLogger from "../logging/errorLogger"
import { parseField } from "../field-parsing/main"

export function checkStringFormat(runtime: Runtime, val: unknown, name: string, required = false): val is string {
  if((required && val != undefined) && typeof val !== 'string'){
    ErrorLogger.logError(
      {
        location: runtime.prefix,
        error: {
          type: "unsupportedFormat",
          field: name,
          actualValue: val,
          supportedValues: "string"
        }
      }
    )
    return false
  }
  return true
}
export function checkStringArrayFormat(runtime: Runtime, val: unknown, name: string, required = false): val is string[] {
    if((required && val != undefined) && !isStringArray(val)){
      ErrorLogger.logError(
        {
          location: runtime.prefix,
          error: {
            type: "unsupportedFormat",
            field: name,
            actualValue: val,
            supportedValues: "string[]"
          }
        }
      )
      return false
    }
    return true
  }
  
export function checkFieldFormat(runtime: Runtime, val: unknown, name: string, required = false): val is Field {
    if((required && val != undefined) && !isField(val)){
      ErrorLogger.logError(
        {
          location: runtime.prefix,
          error: {
            type: "unsupportedFormat",
            field: name,
            actualValue: val,
            supportedValues: "string | {\"field\": string, \"as\": string | undefined}"
          }
        }
      )
      return false
    }
    if(required && val != undefined && isFailure(parseField(runtime, getInputField(val as Field)))){
      return false
    }
    return true
  }
export function checkFieldArrayFormat(runtime: Runtime, val: unknown, name: string, required = false): val is Field[] {
    if((required && val != undefined) && !isFieldArray(val)){
      ErrorLogger.logError(
        {
          location: runtime.prefix,
          error: {
            type: "unsupportedFormat",
            field: name,
            actualValue: val,
            supportedValues: "Field[]"
          }
        }
      )
      return false
    }
    if(required && val != undefined && !(val as Field[]).every(v => !isFailure(parseField(runtime, getInputField(v))))){
      return false
    }
    return true
  }