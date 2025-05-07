import jsonpath from "jsonpath"
import { Error } from "../errors/error"

let _hadError = false
export const hadError = () => _hadError
export function logError(error: Error){
    console.error("error:", error.error)
    console.error("at:", jsonpath.stringify(error.location))
    _hadError = true
}