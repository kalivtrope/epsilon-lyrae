import { Error } from "error"

let _hadError = false
export const hadError = () => _hadError
export function logError(error: Error){
    console.error("error:", error.error) // TODO: add toString()
    _hadError = true
}