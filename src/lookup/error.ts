import { Path } from "commonTypes"

export type AccessError = NonexistentDatasetError | NonexistentFieldError

interface NonexistentFieldError {
  type: 'nonexistentField',
  datasetName: string,
  prefix: Path,
  availableFields: string[],
  field: string
}

interface NonexistentDatasetError {
  type: 'nonexistentDataset',
  datasetName: string,
  availableTables: string[]
}