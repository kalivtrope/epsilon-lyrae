export type TransformError = UnknownTransformError

interface UnknownTransformError {
    type: "unknownTransform",
    name: string
}