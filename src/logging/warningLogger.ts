import { Warning } from "../warnings/warnings"

let _hadWarning = false
export const hadWarning = () => _hadWarning
export function logWarning(warning: Warning){
    console.log("warning:", warning.warning)
    _hadWarning = true
}
