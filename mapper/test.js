"use strict";
exports.__esModule = true;
var fs = require("fs");
var path = require("path");
var OUATtoVISTAARmapper_1 = require("./mappers/OUATtoVISTAARmapper");
function readJsonFile(filePath) {
    var data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}
function main() {
    if (process.argv.length < 3) {
        console.error('Please provide the path to the input JSON file as a command-line argument.');
        process.exit(1);
    }
    var inputFilePath = process.argv[2];
    var absoluteFilePath = path.resolve(inputFilePath);
    var data = readJsonFile(absoluteFilePath);
    var response = (0, OUATtoVISTAARmapper_1.transformOUATDataToVISTAAR)(data);
    console.log("ran");
    console.log('Generated Response:', JSON.stringify(response, null, 2));
}
main();
