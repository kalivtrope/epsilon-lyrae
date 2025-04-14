import * as fs from 'fs';
import { Dict, failure, isFailure, Result } from './commonTypes';
import { loadDatasetData } from './data-loading/main'
import { toArray } from './jsTypes';
import { inferDatasetShape } from './shape-inference/main';
import { Scope } from 'scope';
import { TransformParser } from './transforms/transform';
import { parseExpression } from 'vega-expression';
import { ExpressionContext, inferOutputShape } from './expressions/main';
import { Shape } from './shape-inference/types';


//const expr2 = parseExpression("datum.x.y.z[3]['hello']") 


//console.log("Hello!")
/*
export function pathToString(path: Path): string {
 if(path.length == 0){
  return "";
 }
 let out = path[0].toString()
 for(let i = 1; i < path.length; i++){
  if(typeof path[i] == 'number'){
    out += "[" + path[i] + "]"
  }
  else{
    out += "." + path[i]
  }
 }
 return out;
}
*/
  
const rawSpec = fs.readFileSync(0, 'utf-8');
const parsedSpec = JSON.parse(rawSpec)

const outDatasets: Dict = {}
const scope: Scope = {
  parent: undefined,
  datasets: {},
  datasetData: {},
  signals: []
}

type Spec = {
  signals?: object,
  data?: object,
  scales?: object,
  marks?: object
}

export interface Runtime {
  prefix: string[],
  spec: Spec,
  scope: Scope
}

async function processLevel(runtime: Runtime){
  sanitizeSpec(runtime.spec)
  addSignals(runtime);
  if(isFailure(await addDatasets(runtime)))
    return failure;
  checkScaleAccesses(runtime);
  addGroupMarks(runtime)
}

async function main(){
    await processLevel({prefix: ["$"], spec: parsedSpec, scope: scope})
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
  for(const [index, _dataset] of toArray(parsedSpec.data).entries()){
    runtime.prefix.push(index.toString())
    const dataset = _dataset as Record<string, unknown>
    console.log(`processing dataset \`${dataset.name}\``)
    if(isFailure(await processDataset(runtime, dataset))){
      //console.log("exiting...")
      return failure;
    }
    runtime.prefix.pop()
  }
  runtime.prefix.pop()
}
function addGroupMarks(runtime: Runtime) {
  //throw new Error('Function not implemented.');
}

function sanitizeSpec(spec: Spec) {
  spec.signals = toArray(spec.signals)
  spec.data = toArray(spec.data)
  spec.scales = toArray(spec.scales)
  spec.marks = toArray(spec.marks)
}

function checkScaleAccesses(runtime: Runtime) {
  //throw new Error('Function not implemented.');
}


async function processDataset(runtime: Runtime, dataset: Record<string, unknown>) {
  const datasetName = dataset.name as string
  //runtime.prefix.push(datasetName)
  const datasetData = await loadDatasetData(runtime, dataset)
  if(isFailure(datasetData)){
    //console.log("no data!")
    return failure
  }
  runtime.scope.datasetData[datasetName] = datasetData;
  const initialShape = inferDatasetShape(runtime, datasetData, {datasetName: datasetName, indices: []})
  if(isFailure(initialShape)){
    //console.log("no initial shape!")
    return failure
  }
  console.log("input shape:", initialShape)
  const finalShape = processDatasetTransforms(runtime, initialShape, toArray(dataset.transform));
  if(isFailure(finalShape)){
    //console.log("no final shape!")
    return failure
  }
  runtime.scope.datasets[datasetName] = finalShape
  console.log("dataset `" + datasetName + "` has shape", runtime.scope.datasets[datasetName])
  //runtime.prefix.pop()
}

function processDatasetTransforms(runtime: Runtime, initialShape: Shape, transforms: unknown[]): Result<Shape> {
  runtime.prefix.push("transform")
  let currShape = initialShape
  for(const [index, transform] of transforms.entries()){
    runtime.prefix.push(index.toString())
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
    //console.log("failed to parse!")
    return failure
  }
  return parsedTransform.transform(runtime, shape)
}

main()
