
  
  export function isObject(x: unknown): x is Record<string, unknown> {
    return x === Object(x)
  }
  
  export function isArray(x: unknown): x is unknown[] {
    return Array.isArray(x)
  }
  
  export function toArray(x: unknown): unknown[] {
    // convert x to array if it isn't an array already
    return x != null ? (isArray(x) ? x : [x]) : [];
  }
  