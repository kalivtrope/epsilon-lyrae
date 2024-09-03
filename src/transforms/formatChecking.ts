import { Field, getInputField, isFailure, isField, isFieldArray, isStringArray } from "../commonTypes"
import * as ErrorLogger from "../logging/errorLogger"
import { parseField } from "../fieldParsing"


export function checkStringArrayFormat(val: unknown, name: string, required = false): val is string[] {
    if((required && val != undefined) && isStringArray(val)){
      ErrorLogger.logError(
        {
          location: ["TODO"],
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
  
export function checkFieldFormat(val: unknown, name: string, required = false): val is Field {
    if((required && val != undefined) && !isField(val)){
      ErrorLogger.logError(
        {
          location: ["TODO"],
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
    if(required && val != undefined && isFailure(parseField(getInputField(val as Field)))){
      return false
    }
    return true
  }
export function checkFieldArrayFormat(val: unknown, name: string, required = false): val is Field[] {
    if((required && val != undefined) && !isFieldArray(val)){
      ErrorLogger.logError(
        {
          location: ["TODO"],
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
    if(required && val != undefined && !(val as Field[]).every(v => !isFailure(parseField(getInputField(v))))){
      return false
    }
    return true
  }