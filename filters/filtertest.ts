import { VISTAARData } from "../mapper/models/VISTAAR.model";
import { VISTAAR_SEARCH_FILTER } from "./VISTAAR.filter";
import { filterVISTAARData } from "./filter";
import * as path from 'path';
import * as fs from 'fs';
// Main function to run the filter based on command-line arguments
function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.error('Usage: ts-node filterVISTAARData.ts <path-to-vistaar-json> <path-to-filters-json>');
      process.exit(1);
    }
  
    const vistaarFilePath = path.resolve(args[0]);
    const filtersFilePath = path.resolve(args[1]);
  
    const vistaarData: VISTAARData = JSON.parse(fs.readFileSync(vistaarFilePath, 'utf-8'));
    const filters: VISTAAR_SEARCH_FILTER = JSON.parse(fs.readFileSync(filtersFilePath, 'utf-8'));
  
    const filteredVISTAARData = filterVISTAARData(vistaarData, filters);
    console.log(JSON.stringify(filteredVISTAARData, null, 2));
  }
  
  main();