import { failure, Field, Path, Result, Runtime } from "../types/commonTypes"
import * as ErrorLogger from "../logging/errorLogger"
import * as vega from 'vega'

/* Parse a field string. Note that this might result in a Path.
 *
 * According to Vega, a field can be either specified as a string
 * or an object with a field property.
 */
export function parseField(runtime: Runtime, field: Field): Result<Path> {
    const parse = (f: string): Result<Path> => {
      try {
        return vega.splitAccessPath(f);
      }
      catch (e) {
        const msg = (e as Error).message;
        ErrorLogger.logError({
          location: runtime.prefix,
          error: {
            type: "invalidField",
            field: f,
            reason: msg
          }
        }
        );
        return failure;
      }
    }
    if(typeof field === 'string'){
      return parse(field)
    }
    return parse(field.field)
  }
  