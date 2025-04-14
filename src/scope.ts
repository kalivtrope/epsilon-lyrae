import { Shape } from "./shape-inference/types";

export interface Scope {
    parent: Scope | undefined,
    datasets: Record<string, Shape>,
    datasetData: Record<string, unknown[]>
    signals: string[]
  }
  