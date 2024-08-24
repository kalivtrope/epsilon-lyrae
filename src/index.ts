import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import vegaSchema from 'vega/build/vega-schema.json';
import jsonSchema from 'ajv/dist/refs/json-schema-draft-06.json'
import * as fs from 'fs';


const ajv = new Ajv({
  strict: false,
});

addFormats(ajv);
ajv.addMetaSchema(jsonSchema);

const vegaValidator = ajv.compile(vegaSchema);

function validateVega(spec: string){
  const valid = vegaValidator(spec);
  console.log(valid) 
}

function greeter(person: string){
  return "Hello, " + person;
}

let user = "Jane User"

document.body.textContent = greeter(user);
