import * as fs from 'fs';
import { failure, Field, isFailure, Result, Runtime, ScaleType, Scope, Spec } from './types/commonTypes';
import { loadDatasetData } from './data-loading/main'
import { toArray } from './types/jsTypes';
import { inferDatasetShape } from './shape-inference/main';
import { TransformParser } from './transforms/transform';
import { Shape } from './shape-inference/types';
import { parseField } from './field-parsing/main';
import { shapeAt } from './lookup/main';

async function main(){
  const scope: Scope = {
    parent: undefined,
    datasets: {},
    datasetData: {},
    signals: []
  }
  const rawSpec = fs.readFileSync(0, 'utf-8');
  const parsedSpec = JSON.parse(rawSpec)
  await processLevel({prefix: ["$"], spec: parsedSpec, scope: scope})
}

async function processLevel(runtime: Runtime){
  sanitizeSpec(runtime.spec)
  addSignals(runtime);
  if(isFailure(await addDatasets(runtime)))
    return failure;
  checkScaleAccesses(runtime);
}

function sanitizeSpec(spec: Spec) {
  spec.signals = toArray(spec.signals)
  spec.data = toArray(spec.data)
  spec.scales = toArray(spec.scales) as ScaleType[]
  spec.marks = toArray(spec.marks)
}

function addSignals(runtime: Runtime) {
  if(!runtime.spec.signals)
    return;
  for(const _signal of toArray(runtime.spec.signals)){
    const name = (_signal as {"name": string | undefined}).name
    if(name){
      runtime.scope.signals.push(name);
    }
  }
}

async function addDatasets(runtime: Runtime) {
  runtime.prefix.push("data")
  for(const [index, _dataset] of toArray(runtime.spec.data).entries()){
    runtime.prefix.push(index)
    const dataset = _dataset as Record<string, unknown>
    console.log(`processing dataset \`${dataset.name}\``)
    runtime.currDatasetName = dataset.name as string
    if(isFailure(await processDataset(runtime, dataset))){
      return failure;
    }
    runtime.prefix.pop()
  }
  runtime.prefix.pop()
}



async function processDataset(runtime: Runtime, dataset: Record<string, unknown>) {
  const datasetName = dataset.name as string
  let initialShape;
  if(dataset.url || dataset.values){
    const datasetData = await loadDatasetData(runtime, dataset)
    if(isFailure(datasetData)){
      return failure
    }
    runtime.scope.datasetData[datasetName] = datasetData;
    initialShape = inferDatasetShape(runtime, datasetData, {datasetName: datasetName, indices: []})
  }
  else{
    initialShape = runtime.scope.datasets[dataset.source as string];
  }
  if(!initialShape || isFailure(initialShape)){
    return failure
  }
  console.log("input shape:", initialShape)
  const finalShape = processDatasetTransforms(runtime, initialShape, toArray(dataset.transform));
  if(isFailure(finalShape)){
    return failure
  }
  runtime.scope.datasets[datasetName] = finalShape
  console.log("dataset `" + datasetName + "` has shape", runtime.scope.datasets[datasetName])
}

function processDatasetTransforms(runtime: Runtime, initialShape: Shape, transforms: unknown[]): Result<Shape> {
  runtime.prefix.push("transform")
  let currShape = initialShape
  for(const [index, transform] of transforms.entries()){
    runtime.prefix.push(index)
    const newShape = processDatasetTransform(runtime, currShape, transform)
    if(isFailure(newShape))
      return failure;
    console.log("new shape after", (transform as any).type + ": ", newShape)
    currShape = newShape;
    runtime.prefix.pop()
  }
  runtime.prefix.pop();
  return currShape;
}


function processDatasetTransform(runtime: Runtime, shape: Shape, transform: unknown): Result<Shape> {
  const transformParser = new TransformParser()
  const parsedTransform = transformParser.fromSpec(runtime, transform as {"type": string})
  if(isFailure(parsedTransform)){
    return failure
  }
  return parsedTransform.transform(runtime, shape)
}

function checkScaleAccesses(runtime: Runtime) {
  if(!runtime.spec.scales)
    return;
  runtime.prefix.push("scales");
  for(const [index,_scale] of runtime.spec.scales.entries()){
    runtime.prefix.push(index);
    const datasetName = _scale.domain?.data;
    if(datasetName){
      if(_scale.domain?.field){
        runtime.prefix.push("domain", "field");
        const field = parseField(runtime, _scale.domain.field as Field)
        if(isFailure(field)){
          return failure;
        }
        const res = shapeAt(runtime, datasetName, field, runtime.scope)
        if(isFailure(res)){
          return failure;
        }
        runtime.prefix.pop(); runtime.prefix.pop();
      }
      if(_scale.domain?.fields){
        runtime.prefix.push("domain", "fields");
        for(const [index2,_field] of _scale.domain.fields.entries()){
          runtime.prefix.push(index2);
          const field = parseField(runtime, _field as Field)
          if(isFailure(field)){
            return failure;
          }
          const res = shapeAt(runtime, datasetName, field, runtime.scope);
          if(isFailure(res)){
            return failure;
          }
          runtime.prefix.pop(); runtime.prefix.pop();
        }
        runtime.prefix.pop();
      }
      if(_scale.domain?.sort?.field){
        runtime.prefix.push("domain", "sort", "field");
        const field = parseField(runtime, _scale.domain.sort.field as Field)
        if(isFailure(field)){
          return failure;
        }
        const res = shapeAt(runtime, datasetName, field, runtime.scope);
        if(isFailure(res)){
          return failure;
        }
        runtime.prefix.pop(); runtime.prefix.pop(); runtime.prefix.pop();
      }
    }
    runtime.prefix.pop();
  }
  runtime.prefix.pop();
}




main()