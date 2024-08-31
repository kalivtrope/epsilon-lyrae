export type Dict = Record<Key, unknown>;

type Key = string | number
export type Path = Key[]
  
export interface Intersection {
    keys: string[]
}

export interface Context {
    datasetName : string,
    indices: Path
}