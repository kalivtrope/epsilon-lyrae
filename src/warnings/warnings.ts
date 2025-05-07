export interface UnsupportedFeatureWarning {
    type: "unsupportedFeature"
    message: string
}

export interface Warning {
    location: (string | number)[],
    warning: UnsupportedFeatureWarning
}

export function isUnsupportedFeatureWarning(val: unknown): val is UnsupportedFeatureWarning {
  return (val as UnsupportedFeatureWarning).type == "unsupportedFeature"
}
