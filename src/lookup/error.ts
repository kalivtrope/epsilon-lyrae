import { Path } from "../types/commonTypes"

export type AccessError = NonexistentDatasetError | NonexistentFieldError | ArrayOutOfBoundsError | StringIndexedArrayError

interface NonexistentFieldError {
  type: 'nonexistentField',
  datasetName: string,
  object?: string,
  prefix?: Path,
  availableFields?: string[],
  field: string
}

interface NonexistentDatasetError {
  type: 'nonexistentDataset',
  datasetName: string,
  availableTables: string[]
}

export interface ArrayOutOfBoundsError {
  type: 'outOfBounds',
  datasetName: string,
  array: unknown,
  index: number,
  length: number,
}

export interface StringIndexedArrayError {
  type: 'stringIndexedArray',
  datasetName: string,
  array: unknown,
  index: string
}