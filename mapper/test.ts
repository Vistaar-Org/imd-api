import { JSONPath } from 'jsonpath-plus';
import * as fs from 'fs';
import * as path from 'path';
// import { transformOUATDataToBeckn } from './mappers/OUATmapper'
import { transformIMDDataToBeckn } from './mappers/IMDmapper';
import { transformIMDDataToVISTAAR } from './mappers/IMDtoVISTAARmapper';
import { transformOUATDataToVISTAAR } from './mappers/OUATtoVISTAARmapper';

function readJsonFile(filePath: string): any {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

function main() {
    if (process.argv.length < 3) {
      console.error('Please provide the path to the input JSON file as a command-line argument.');
      process.exit(1);
    }
  
    const inputFilePath = process.argv[2];
    const absoluteFilePath = path.resolve(inputFilePath);
    const data = readJsonFile(absoluteFilePath);
    const response = transformOUATDataToVISTAAR(data);
    console.log("ran");
    console.log('Generated Response:', JSON.stringify(response, null, 2));
  }

main();