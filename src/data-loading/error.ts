export type ParseError = UnsupportedFormatError | InvalidFieldError

export interface InvalidFieldError {
  type: "invalidField",
  field: unknown,
  reason: string
}
export interface UnsupportedFormatError {
  type: "unsupportedFormat",
  field: string,
  actualValue: unknown
  supportedValues: unknown
}
