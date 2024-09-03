import { Warning } from "../warnings"

let _hadWarning = false
export const hadWarning = () => _hadWarning
export function logWarning(warning: Warning){
    console.log("warning:", warning.warning) // TODO: add toString
    _hadWarning = true
}
