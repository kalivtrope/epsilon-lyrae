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

export const zip = (...arrays: unknown[][]) => {
  const maxLength = Math.max(...arrays.map((x) => x.length));
  return Array.from({ length: maxLength }).map((_, i) => {
    return Array.from({ length: arrays.length }, (_, k) => arrays[k][i]);
  });
};