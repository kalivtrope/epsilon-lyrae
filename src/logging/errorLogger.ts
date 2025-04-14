import { Error } from "error"

let _hadError = false
export const hadError = () => _hadError
export function logError(error: Error){
    console.error("error:", error.error)
    console.error("at:", error.location)
    _hadError = true
}