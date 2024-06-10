"use strict";
exports.__esModule = true;
var filter_1 = require("./filter");
var path = require("path");
var fs = require("fs");
// Main function to run the filter based on command-line arguments
function main() {
    var args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: ts-node filterVISTAARData.ts <path-to-vistaar-json> <path-to-filters-json>');
        process.exit(1);
    }
    var vistaarFilePath = path.resolve(args[0]);
    var filtersFilePath = path.resolve(args[1]);
    var vistaarData = JSON.parse(fs.readFileSync(vistaarFilePath, 'utf-8'));
    var filters = JSON.parse(fs.readFileSync(filtersFilePath, 'utf-8'));
    var filteredVISTAARData = (0, filter_1.filterVISTAARData)(vistaarData, filters);
    console.log(JSON.stringify(filteredVISTAARData, null, 2));
}
main();
