'use strict';

var yargs = require('yargs');
var tmp = require('tmp');
var fs = require('fs');
var childProcessPromise = require('child-process-promise');
var util = require('@firebase/util');
var rollup = require('rollup');
var resolve = require('@rollup/plugin-node-resolve');
var commonjs = require('@rollup/plugin-commonjs');
var virtual = require('@rollup/plugin-virtual');
var webpack = require('webpack');
var virtualModulesPlugin = require('webpack-virtual-modules');
var memfs = require('memfs');
var path = require('path');
var calculateGzipSize = require('gzip-size');
var terser = require('terser');
var ts = require('typescript');
var glob = require('glob');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var resolve__default = /*#__PURE__*/_interopDefaultLegacy(resolve);
var commonjs__default = /*#__PURE__*/_interopDefaultLegacy(commonjs);
var virtual__default = /*#__PURE__*/_interopDefaultLegacy(virtual);
var webpack__default = /*#__PURE__*/_interopDefaultLegacy(webpack);
var virtualModulesPlugin__default = /*#__PURE__*/_interopDefaultLegacy(virtualModulesPlugin);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var calculateGzipSize__default = /*#__PURE__*/_interopDefaultLegacy(calculateGzipSize);
var glob__default = /*#__PURE__*/_interopDefaultLegacy(glob);

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 *
 * @param fileContent
 * @param moduleDirectory - the path to the node_modules folder of the temporary project in npm mode.
 *                          undefined in local mode
 */
async function bundleWithRollup(fileContent, moduleDirectory) {
    const resolveOptions = {
        mainFields: ['esm2017', 'module', 'main']
    };
    if (moduleDirectory) {
        resolveOptions.customResolveOptions = {
            moduleDirectory
        };
    }
    const bundle = await rollup.rollup({
        input: 'entry',
        plugins: [
            virtual__default['default']({
                entry: fileContent
            }),
            resolve__default['default'](resolveOptions),
            commonjs__default['default']()
        ]
    });
    const { output } = await bundle.generate({
        format: 'es'
    });
    return output[0].code;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function calculateContentSize(content) {
    const size = Buffer.byteLength(content, 'utf-8');
    const gzipSize = calculateGzipSize__default['default'].sync(content);
    return {
        size,
        gzipSize
    };
}
const projectRoot = path.dirname(path.resolve(__dirname, '../../package.json'));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 *
 * @param fileContent
 * @param moduleDirectory - the path to the node_modules folder of the temporary project in npm mode.
 *                          undefined in local mode
 */
async function bundleWithWebpack(fileContent, moduleDirectory) {
    const entryFileName = '/virtual_path_to_in_memory_file/index.js';
    const outputFileName = 'o.js';
    const resolveConfig = {
        mainFields: ['esm2017', 'module', 'main']
    };
    if (moduleDirectory) {
        resolveConfig.modules = [moduleDirectory];
    }
    else {
        // local mode
        resolveConfig.modules = [`${projectRoot}/node_modules`];
    }
    const compiler = webpack__default['default']({
        entry: entryFileName,
        output: {
            filename: outputFileName
        },
        resolve: resolveConfig,
        plugins: [
            new virtualModulesPlugin__default['default']({
                [entryFileName]: fileContent
            })
        ],
        mode: 'production'
    });
    // use virtual file system for output to avoid I/O
    compiler.outputFileSystem = getMemoryFileSystem();
    return new Promise((res, rej) => {
        compiler.run((err, stats) => {
            if (err) {
                rej(err);
                return;
            }
            // Hack to get string output without reading the output file using an internal API from webpack
            res(stats.compilation.assets[outputFileName]._value);
        });
    });
}
function getMemoryFileSystem() {
    const fs = memfs.createFsFromVolume(new memfs.Volume());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fs.join = path__default['default'].join.bind(path__default['default']);
    return fs;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function minify(content) {
    var _a;
    const minified = await terser.minify(content, {
        format: {
            comments: false
        },
        mangle: { toplevel: true },
        compress: false
    });
    return (_a = minified.code) !== null && _a !== void 0 ? _a : '';
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Helper for extractDependencies that extracts the dependencies and the size
 * of the minified build.
 */
async function extractDependenciesAndSize(exportName, jsBundle, map) {
    const input = tmp.fileSync().name + '.js';
    const externalDepsResolvedOutput = tmp.fileSync().name + '.js';
    const externalDepsNotResolvedOutput = tmp.fileSync().name + '.js';
    const exportStatement = `export { ${exportName} } from '${path.resolve(jsBundle)}';`;
    fs.writeFileSync(input, exportStatement);
    // Run Rollup on the JavaScript above to produce a tree-shaken build
    const externalDepsResolvedBundle = await rollup.rollup({
        input,
        plugins: [
            resolve__default['default']({
                mainFields: ['esm2017', 'module', 'main']
            }),
            commonjs__default['default']()
        ]
    });
    await externalDepsResolvedBundle.write({
        file: externalDepsResolvedOutput,
        format: 'es'
    });
    const externalDepsNotResolvedBundle = await rollup.rollup({
        input,
        external: id => id.startsWith('@firebase') // exclude all firebase dependencies
    });
    await externalDepsNotResolvedBundle.write({
        file: externalDepsNotResolvedOutput,
        format: 'es'
    });
    const dependencies = extractDeclarations(externalDepsNotResolvedOutput, map);
    const externalDepsResolvedOutputContent = fs.readFileSync(externalDepsResolvedOutput, 'utf-8');
    // Extract size of minified build
    const externalDepsNotResolvedOutputContent = fs.readFileSync(externalDepsNotResolvedOutput, 'utf-8');
    const externalDepsResolvedOutputContentMinimized = await terser.minify(externalDepsResolvedOutputContent, {
        format: {
            comments: false
        },
        mangle: { toplevel: true },
        compress: false
    });
    const externalDepsNotResolvedOutputContentMinimized = await terser.minify(externalDepsNotResolvedOutputContent, {
        format: {
            comments: false
        },
        mangle: { toplevel: true },
        compress: false
    });
    const exportData = {
        name: '',
        classes: [],
        functions: [],
        variables: [],
        enums: [],
        externals: {},
        size: 0,
        sizeWithExtDeps: 0
    };
    exportData.name = exportName;
    for (const key of Object.keys(dependencies)) {
        exportData[key] = dependencies[key];
    }
    exportData.externals = extractExternalDependencies(externalDepsNotResolvedOutput);
    exportData.size = Buffer.byteLength(externalDepsNotResolvedOutputContentMinimized.code, 'utf-8');
    exportData.sizeWithExtDeps = Buffer.byteLength(externalDepsResolvedOutputContentMinimized.code, 'utf-8');
    fs.unlinkSync(input);
    fs.unlinkSync(externalDepsNotResolvedOutput);
    fs.unlinkSync(externalDepsResolvedOutput);
    return exportData;
}
/**
 * Extracts all function, class and variable declarations using the TypeScript
 * compiler API.
 * @param map maps every symbol listed in dts file to its type. eg: aVariable -> variable.
 * map is null when given filePath is a path to d.ts file.
 * map is populated when given filePath points to a .js bundle file.
 *
 * Examples of Various Type of Exports
 * FunctionDeclaration: export function aFunc(): string {...};
 * ClassDeclaration: export class aClass {};
 * EnumDeclaration: export enum aEnum {};
 * VariableDeclaration: export let aVariable: string; import * as tmp from 'tmp'; export declare const aVar: tmp.someType.
 * VariableStatement: export const aVarStatement: string = "string"; export const { a, b } = { a: 'a', b: 'b' };
 * ExportDeclaration:
 *      named exports: export {foo, bar} from '...'; export {foo as foo1, bar} from '...'; export {LogLevel};
 *      export everything: export * from '...';
 */
function extractDeclarations(filePath, map) {
    const program = ts.createProgram([filePath], { allowJs: true });
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
        throw new Error(`${"Failed to parse js file!" /* FILE_PARSING_ERROR */} ${filePath}`);
    }
    let declarations = {
        functions: [],
        classes: [],
        variables: [],
        enums: []
    };
    const namespaceImportSet = new Set();
    // define a map here which is used to handle export statements that have no from clause.
    // As there is no from clause in such export statements, we retrieve symbol location by parsing the corresponding import
    // statements. We store the symbol and its defined location as key value pairs in the map.
    const importSymbolCurrentNameToModuleLocation = new Map();
    const importSymbolCurrentNameToOriginalName = new Map(); // key: current name value: original name
    const importModuleLocationToExportedSymbolsList = new Map(); // key: module location, value: a list of all exported symbols of the module
    ts.forEachChild(sourceFile, node => {
        if (ts.isFunctionDeclaration(node)) {
            declarations.functions.push(node.name.text);
        }
        else if (ts.isClassDeclaration(node)) {
            declarations.classes.push(node.name.text);
        }
        else if (ts.isVariableDeclaration(node)) {
            declarations.variables.push(node.name.getText());
        }
        else if (ts.isEnumDeclaration(node)) {
            declarations.enums.push(node.name.escapedText.toString());
        }
        else if (ts.isVariableStatement(node)) {
            const variableDeclarations = node.declarationList.declarations;
            variableDeclarations.forEach(variableDeclaration => {
                //variableDeclaration.name could be of Identifier type or of BindingPattern type
                // Identifier Example: export const a: string = "aString";
                if (ts.isIdentifier(variableDeclaration.name)) {
                    declarations.variables.push(variableDeclaration.name.getText(sourceFile));
                }
                // Binding Pattern Example: export const {a, b} = {a: 1, b: 1};
                else {
                    const elements = variableDeclaration.name.elements;
                    elements.forEach((node) => {
                        declarations.variables.push(node.name.getText(sourceFile));
                    });
                }
            });
        }
        else if (ts.isImportDeclaration(node) && node.importClause) {
            const symbol = checker.getSymbolAtLocation(node.moduleSpecifier);
            if (symbol && symbol.valueDeclaration) {
                const importFilePath = symbol.valueDeclaration.getSourceFile().fileName;
                // import { a, b } from '@firebase/dummy-exp'
                // import {a as A, b as B} from '@firebase/dummy-exp'
                if (node.importClause.namedBindings &&
                    ts.isNamedImports(node.importClause.namedBindings)) {
                    node.importClause.namedBindings.elements.forEach(each => {
                        const symbolName = each.name.getText(sourceFile); // import symbol current name
                        importSymbolCurrentNameToModuleLocation.set(symbolName, importFilePath);
                        // if imported symbols are renamed, insert an entry to importSymbolCurrentNameToOriginalName Map
                        // with key the current name, value the original name
                        if (each.propertyName) {
                            importSymbolCurrentNameToOriginalName.set(symbolName, each.propertyName.getText(sourceFile));
                        }
                    });
                    // import * as fs from 'fs'
                }
                else if (node.importClause.namedBindings &&
                    ts.isNamespaceImport(node.importClause.namedBindings)) {
                    const symbolName = node.importClause.namedBindings.name.getText(sourceFile);
                    namespaceImportSet.add(symbolName);
                    // import a from '@firebase/dummy-exp'
                }
                else if (node.importClause.name &&
                    ts.isIdentifier(node.importClause.name)) {
                    const symbolName = node.importClause.name.getText(sourceFile);
                    importSymbolCurrentNameToModuleLocation.set(symbolName, importFilePath);
                }
            }
        }
        // re-exports handler: handles cases like :
        // export {LogLevel};
        // export * from '..';
        // export {foo, bar} from '..';
        // export {foo as foo1, bar} from '...';
        else if (ts.isExportDeclaration(node)) {
            // this clause handles the export statements that have a from clause (referred to as moduleSpecifier in ts compiler).
            // examples are "export {foo as foo1, bar} from '...';"
            // and "export * from '..';"
            if (node.moduleSpecifier) {
                if (ts.isStringLiteral(node.moduleSpecifier)) {
                    const reExportsWithFromClause = handleExportStatementsWithFromClause(checker, node, node.moduleSpecifier.getText(sourceFile));
                    // concatenate re-exported MemberList with MemberList of the dts file
                    for (const key of Object.keys(declarations)) {
                        declarations[key].push(...reExportsWithFromClause[key]);
                    }
                }
            }
            else {
                // export {LogLevel};
                // exclusively handles named export statements that has no from clause.
                handleExportStatementsWithoutFromClause(node, importSymbolCurrentNameToModuleLocation, importSymbolCurrentNameToOriginalName, importModuleLocationToExportedSymbolsList, namespaceImportSet, declarations);
            }
        }
    });
    declarations = dedup(declarations);
    if (map) {
        declarations = mapSymbolToType(map, declarations);
    }
    //Sort to ensure stable output
    Object.values(declarations).map(each => {
        each.sort();
    });
    return declarations;
}
/**
 *
 * @param node compiler representation of an export statement
 *
 * This function exclusively handles export statements that have a from clause. The function uses checker argument to resolve
 * module name specified in from clause to its actual location. It then retrieves all exported symbols from the module.
 * If the statement is a named export, the function does an extra step, that is, filtering out the symbols that are not listed
 * in exportClause.
 */
function handleExportStatementsWithFromClause(checker, node, moduleName) {
    const symbol = checker.getSymbolAtLocation(node.moduleSpecifier);
    let declarations = {
        functions: [],
        classes: [],
        variables: [],
        enums: []
    };
    if (symbol && symbol.valueDeclaration) {
        const reExportFullPath = symbol.valueDeclaration.getSourceFile().fileName;
        // first step: always retrieve all exported symbols from the source location of the re-export.
        declarations = extractDeclarations(reExportFullPath);
        // if it's a named export statement, filter the MemberList to keep only those listed in exportClause.
        // named exports: eg: export {foo, bar} from '...'; and export {foo as foo1, bar} from '...';
        declarations = extractSymbolsFromNamedExportStatement(node, declarations);
    }
    // if the module name in the from clause cant be resolved to actual module location,
    // just extract symbols listed in the exportClause for named exports, put them in variables first, as
    // they will be categorized later using map argument.
    else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(exportSpecifier => {
            declarations.variables.push(exportSpecifier.name.escapedText.toString());
        });
    }
    // handles the case when exporting * from a module whose location can't be resolved
    else {
        console.log(`The public API extraction of ${moduleName} is not complete, because it re-exports from ${moduleName} using * export but we couldn't resolve ${moduleName}`);
    }
    return declarations;
}
/**
 *
 * @param node compiler representation of a named export statement
 * @param exportsFullList a list of all exported symbols retrieved from the location given in the export statement.
 *
 * This function filters on exportsFullList and keeps only those symbols that are listed in the given named export statement.
 */
function extractSymbolsFromNamedExportStatement(node, exportsFullList) {
    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        const actualExports = [];
        node.exportClause.elements.forEach(exportSpecifier => {
            const reExportedSymbol = extractOriginalSymbolName(exportSpecifier);
            // eg: export {foo as foo1 } from '...';
            // if export is renamed, replace with new name
            // reExportedSymbol: stores the original symbol name
            // exportSpecifier.name: stores the renamed symbol name
            if (isExportRenamed(exportSpecifier)) {
                actualExports.push(exportSpecifier.name.escapedText.toString());
                // reExportsMember stores all re-exported symbols in its orignal name. However, these re-exported symbols
                // could be renamed by the re-export. We want to show the renamed name of the symbols in the final analysis report.
                // Therefore, replaceAll simply replaces the original name of the symbol with the new name defined in re-export.
                replaceAll(exportsFullList, reExportedSymbol, exportSpecifier.name.escapedText.toString());
            }
            else {
                actualExports.push(reExportedSymbol);
            }
        });
        // for named exports: requires a filter step which keeps only the symbols listed in the export statement.
        filterAllBy(exportsFullList, actualExports);
    }
    return exportsFullList;
}
/**
 * @param node compiler representation of a named export statement
 * @param importSymbolCurrentNameToModuleLocation a map with imported symbol current name as key and the resolved module location as value. (map is populated by parsing import statements)
 * @param importSymbolCurrentNameToOriginalName as imported symbols can be renamed, this map stores imported symbols current name and original name as key value pairs.
 * @param importModuleLocationToExportedSymbolsList a map that maps module location to a list of its exported symbols.
 * @param namespaceImportSymbolSet a set of namespace import symbols.
 * @param parentDeclarations a list of exported symbols extracted from the module so far
 * This function exclusively handles named export statements that has no from clause, i.e: statements like export {LogLevel};
 * first case: namespace export
 * example: import * as fs from 'fs'; export {fs};
 * The function checks if namespaceImportSymbolSet has a namespace import symbol that of the same name, append the symbol to declarations.variables if exists.
 *
 * second case: import then export
 * example: import {a} from '...'; export {a}
 * The function retrieves the location where the exported symbol is defined from the corresponding import statements.
 *
 * third case: declare first then export
 * examples: declare const apps: Map<string, number>; export { apps };
 * function foo(){} ; export {foo as bar};
 * The function parses export clause of the statement and replaces symbol with its current name (if the symbol is renamed) from the declaration argument.
 */
function handleExportStatementsWithoutFromClause(node, importSymbolCurrentNameToModuleLocation, importSymbolCurrentNameToOriginalName, importModuleLocationToExportedSymbolsList, namespaceImportSymbolSet, parentDeclarations) {
    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(exportSpecifier => {
            // export symbol could be renamed, we retrieve both its current/renamed name and original name
            const exportSymbolCurrentName = exportSpecifier.name.escapedText.toString();
            const exportSymbolOriginalName = extractOriginalSymbolName(exportSpecifier);
            // import * as fs from 'fs';  export {fs};
            if (namespaceImportSymbolSet.has(exportSymbolOriginalName)) {
                parentDeclarations.variables.push(exportSymbolOriginalName);
                replaceAll(parentDeclarations, exportSymbolOriginalName, exportSymbolCurrentName);
            }
            // handles import then exports
            // import {a as A , b as B} from '...'
            // export {A as AA , B as BB };
            else if (importSymbolCurrentNameToModuleLocation.has(exportSymbolOriginalName)) {
                const moduleLocation = importSymbolCurrentNameToModuleLocation.get(exportSymbolOriginalName);
                let reExportedSymbols;
                if (importModuleLocationToExportedSymbolsList.has(moduleLocation)) {
                    reExportedSymbols = util.deepCopy(importModuleLocationToExportedSymbolsList.get(moduleLocation));
                }
                else {
                    reExportedSymbols = extractDeclarations(importSymbolCurrentNameToModuleLocation.get(exportSymbolOriginalName));
                    importModuleLocationToExportedSymbolsList.set(moduleLocation, util.deepCopy(reExportedSymbols));
                }
                let nameToBeReplaced = exportSymbolOriginalName;
                // if current exported symbol is renamed in import clause. then we retrieve its original name from
                // importSymbolCurrentNameToOriginalName map
                if (importSymbolCurrentNameToOriginalName.has(exportSymbolOriginalName)) {
                    nameToBeReplaced = importSymbolCurrentNameToOriginalName.get(exportSymbolOriginalName);
                }
                filterAllBy(reExportedSymbols, [nameToBeReplaced]);
                // replace with new name
                replaceAll(reExportedSymbols, nameToBeReplaced, exportSymbolCurrentName);
                // concatenate re-exported MemberList with MemberList of the dts file
                for (const key of Object.keys(parentDeclarations)) {
                    parentDeclarations[key].push(...reExportedSymbols[key]);
                }
            }
            // handles declare first then export
            // declare const apps: Map<string, number>;
            // export { apps as apps1};
            // function a() {};
            // export {a};
            else {
                if (isExportRenamed(exportSpecifier)) {
                    replaceAll(parentDeclarations, exportSymbolOriginalName, exportSymbolCurrentName);
                }
            }
        });
    }
}
/**
 * To Make sure symbols of every category are unique.
 */
function dedup(memberList) {
    for (const key of Object.keys(memberList)) {
        const set = new Set(memberList[key]);
        memberList[key] = Array.from(set);
    }
    return memberList;
}
function mapSymbolToType(map, memberList) {
    const newMemberList = {
        functions: [],
        classes: [],
        variables: [],
        enums: []
    };
    for (const key of Object.keys(memberList)) {
        memberList[key].forEach((element) => {
            if (map.has(element)) {
                newMemberList[map.get(element)].push(element);
            }
            else {
                newMemberList[key].push(element);
            }
        });
    }
    return newMemberList;
}
function extractOriginalSymbolName(exportSpecifier) {
    // if symbol is renamed, then exportSpecifier.propertyName is not null and stores the orignal name, exportSpecifier.name stores the renamed name.
    // if symbol is not renamed, then exportSpecifier.propertyName is null, exportSpecifier.name stores the orignal name.
    if (exportSpecifier.propertyName) {
        return exportSpecifier.propertyName.escapedText.toString();
    }
    return exportSpecifier.name.escapedText.toString();
}
function filterAllBy(memberList, keep) {
    for (const key of Object.keys(memberList)) {
        memberList[key] = memberList[key].filter(each => keep.includes(each));
    }
}
function replaceAll(memberList, original, current) {
    for (const key of Object.keys(memberList)) {
        memberList[key] = replaceWith(memberList[key], original, current);
    }
}
function replaceWith(arr, original, current) {
    const rv = [];
    for (const each of arr) {
        if (each.localeCompare(original) === 0) {
            rv.push(current);
        }
        else {
            rv.push(each);
        }
    }
    return rv;
}
function isExportRenamed(exportSpecifier) {
    return exportSpecifier.propertyName != null;
}
/**
 *
 * This functions writes generated json report(s) to a file
 */
function writeReportToFile(report, outputFile) {
    if (fs.existsSync(outputFile) && !fs.lstatSync(outputFile).isFile()) {
        throw new Error("An output file is required but a directory given!" /* OUTPUT_FILE_REQUIRED */);
    }
    const directoryPath = path.dirname(outputFile);
    //for output file path like ./dir/dir1/dir2/file, we need to make sure parent dirs exist.
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 4));
}
/**
 *
 * This functions writes generated json report(s) to a file of given directory
 */
function writeReportToDirectory(report, fileName, directoryPath) {
    if (fs.existsSync(directoryPath) &&
        !fs.lstatSync(directoryPath).isDirectory()) {
        throw new Error("An output directory is required but a file given!" /* OUTPUT_DIRECTORY_REQUIRED */);
    }
    writeReportToFile(report, `${directoryPath}/${fileName}`);
}
/**
 * This function extract unresolved external module symbols from bundle file import statements.
 *
 */
function extractExternalDependencies(minimizedBundleFile) {
    const program = ts.createProgram([minimizedBundleFile], { allowJs: true });
    const sourceFile = program.getSourceFile(minimizedBundleFile);
    if (!sourceFile) {
        throw new Error(`${"Failed to parse js file!" /* FILE_PARSING_ERROR */} ${minimizedBundleFile}`);
    }
    const externalsMap = new Map();
    ts.forEachChild(sourceFile, node => {
        if (ts.isImportDeclaration(node) && node.importClause) {
            const moduleName = node.moduleSpecifier.getText(sourceFile);
            if (!externalsMap.has(moduleName)) {
                externalsMap.set(moduleName, []);
            }
            //import {a, b } from '@firebase/dummy-exp';
            // import {a as c, b } from '@firebase/dummy-exp';
            if (node.importClause.namedBindings &&
                ts.isNamedImports(node.importClause.namedBindings)) {
                node.importClause.namedBindings.elements.forEach(each => {
                    // if imported symbol is renamed, we want its original name which is stored in propertyName
                    if (each.propertyName) {
                        externalsMap
                            .get(moduleName)
                            .push(each.propertyName.getText(sourceFile));
                    }
                    else {
                        externalsMap.get(moduleName).push(each.name.getText(sourceFile));
                    }
                });
                // import * as fs from 'fs'
            }
            else if (node.importClause.namedBindings &&
                ts.isNamespaceImport(node.importClause.namedBindings)) {
                externalsMap.get(moduleName).push('*');
                // import a from '@firebase/dummy-exp'
            }
            else if (node.importClause.name &&
                ts.isIdentifier(node.importClause.name)) {
                externalsMap.get(moduleName).push('default export');
            }
        }
    });
    const externals = {};
    externalsMap.forEach((value, key) => {
        externals[key.replace(/'/g, '')] = value;
    });
    return externals;
}
/**
 * This function generates a binary size report for the given module specified by the moduleLocation argument.
 * @param moduleLocation a path to location of a firebase module
 */
async function generateReportForModule(moduleLocation) {
    const packageJsonPath = `${moduleLocation}/package.json`;
    if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`Firebase Module locates at ${moduleLocation}: ${"Module does not have a package.json file!" /* PKG_JSON_DOES_NOT_EXIST */}`);
    }
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, { encoding: 'utf-8' }));
    // to exclude <modules>-types modules
    const TYPINGS = 'typings';
    if (packageJson[TYPINGS]) {
        const dtsFile = `${moduleLocation}/${packageJson[TYPINGS]}`;
        const bundleLocation = retrieveBundleFileLocation(packageJson);
        if (!bundleLocation) {
            throw new Error("Module does not have a bundle file!" /* BUNDLE_FILE_DOES_NOT_EXIST */);
        }
        const bundleFile = `${moduleLocation}/${bundleLocation}`;
        const jsonReport = await generateReport(packageJson.name, dtsFile, bundleFile);
        return jsonReport;
    }
    throw new Error(`Firebase Module locates at: ${moduleLocation}: ${"Module does not have typings field defined in its package.json!" /* TYPINGS_FIELD_NOT_DEFINED */}`);
}
/**
 *
 * @param pkgJson package.json of the module.
 *
 * This function implements a fallback of locating module's budle file.
 * It first looks at esm2017 field of package.json, then module field. Main
 * field at the last.
 *
 */
function retrieveBundleFileLocation(pkgJson) {
    if (pkgJson['esm2017']) {
        return pkgJson['esm2017'];
    }
    if (pkgJson['module']) {
        return pkgJson['module'];
    }
    if (pkgJson['main']) {
        return pkgJson['main'];
    }
    return '';
}
/**
 *
 * This function creates a map from a MemberList object which maps symbol names (key) listed
 * to its type (value)
 */
function buildMap(api) {
    const map = new Map();
    for (const type of Object.keys(api)) {
        api[type].forEach((element) => {
            map.set(element, type);
        });
    }
    return map;
}
/**
 * A recursive function that locates and generates reports for sub-modules
 */
async function traverseDirs(moduleLocation, 
// eslint-disable-next-line @typescript-eslint/ban-types
executor, level, levelLimit) {
    if (level > levelLimit) {
        return [];
    }
    const reports = [];
    const report = await executor(moduleLocation);
    if (report != null) {
        reports.push(report);
    }
    for (const name of fs.readdirSync(moduleLocation)) {
        const p = `${moduleLocation}/${name}`;
        const generateSizeAnalysisReportPkgJsonField = 'generate-size-analysis-report';
        // submodules of a firebase module should set generate-size-analysis-report field of package.json to true
        // in order to be analyzed
        if (fs.lstatSync(p).isDirectory() &&
            fs.existsSync(`${p}/package.json`) &&
            JSON.parse(fs.readFileSync(`${p}/package.json`, { encoding: 'utf-8' }))[generateSizeAnalysisReportPkgJsonField]) {
            const subModuleReports = await traverseDirs(p, executor, level + 1, levelLimit);
            if (subModuleReports !== null && subModuleReports.length !== 0) {
                reports.push(...subModuleReports);
            }
        }
    }
    return reports;
}
/**
 *
 * This functions generates the final json report for the module.
 * @param publicApi all symbols extracted from the input dts file.
 * @param jsFile a bundle file generated by rollup according to the input dts file.
 * @param map maps every symbol listed in publicApi to its type. eg: aVariable -> variable.
 */
async function buildJsonReport(moduleName, publicApi, jsFile, map) {
    const result = {
        name: moduleName,
        symbols: []
    };
    for (const exp of publicApi.classes) {
        result.symbols.push(await extractDependenciesAndSize(exp, jsFile, map));
    }
    for (const exp of publicApi.functions) {
        result.symbols.push(await extractDependenciesAndSize(exp, jsFile, map));
    }
    for (const exp of publicApi.variables) {
        result.symbols.push(await extractDependenciesAndSize(exp, jsFile, map));
    }
    for (const exp of publicApi.enums) {
        result.symbols.push(await extractDependenciesAndSize(exp, jsFile, map));
    }
    return result;
}
/**
 *
 * This function generates a report from given dts file.
 * @param name a name to be displayed on the report. a module name if for a firebase module; a random name if for adhoc analysis.
 * @param dtsFile absolute path to the definition file of interest.
 * @param bundleFile absolute path to the bundle file of the given definition file.
 */
async function generateReport(name, dtsFile, bundleFile) {
    const resolvedDtsFile = path.resolve(dtsFile);
    const resolvedBundleFile = path.resolve(bundleFile);
    if (!fs.existsSync(resolvedDtsFile)) {
        throw new Error("Input dts file does not exist!" /* INPUT_DTS_FILE_DOES_NOT_EXIST */);
    }
    if (!fs.existsSync(resolvedBundleFile)) {
        throw new Error("Input bundle file does not exist!" /* INPUT_BUNDLE_FILE_DOES_NOT_EXIST */);
    }
    const publicAPI = extractDeclarations(resolvedDtsFile);
    const map = buildMap(publicAPI);
    return buildJsonReport(name, publicAPI, bundleFile, map);
}
/**
 * This function recursively generates a binary size report for every module listed in moduleLocations array.
 *
 * @param moduleLocations an array of strings where each is a path to location of a firebase module
 *
 */
async function generateReportForModules(moduleLocations) {
    const reportCollection = [];
    for (const moduleLocation of moduleLocations) {
        // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
        // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
        const reportsForModuleAndItsSubModule = await traverseDirs(moduleLocation, generateReportForModule, 0, 1);
        if (reportsForModuleAndItsSubModule !== null &&
            reportsForModuleAndItsSubModule.length !== 0) {
            reportCollection.push(...reportsForModuleAndItsSubModule);
        }
    }
    return reportCollection;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Bundler;
(function (Bundler) {
    Bundler["Rollup"] = "rollup";
    Bundler["Webpack"] = "webpack";
    Bundler["Both"] = "both";
})(Bundler || (Bundler = {}));
var Mode;
(function (Mode) {
    Mode["Npm"] = "npm";
    Mode["Local"] = "local";
})(Mode || (Mode = {}));
var SpecialImport;
(function (SpecialImport) {
    SpecialImport["Default"] = "default import";
    SpecialImport["Sizeeffect"] = "side effect import";
    SpecialImport["Namespace"] = "namespace import";
})(SpecialImport || (SpecialImport = {}));
async function run({ input, bundler, mode, output, debug }) {
    const options = {
        bundleDefinitions: loadBundleDefinitions(input),
        bundler: toBundlerEnum(bundler),
        mode: toModeEnum(mode),
        output,
        debug
    };
    return analyze(options);
}
function loadBundleDefinitions(path) {
    if (!fs.existsSync(path)) {
        throw new Error(`${path} doesn't exist. Please provide a valid path to the bundle defintion file.`);
    }
    if (fs.lstatSync(path).isDirectory()) {
        throw new Error(`Expecting a file, but ${path} is a directory. Please provide a valid path to the bundle definition file.`);
    }
    const def = parseBundleDefinition(fs.readFileSync(path, { encoding: 'utf-8' }));
    return def;
}
function toBundlerEnum(bundler) {
    switch (bundler) {
        case 'rollup':
            return Bundler.Rollup;
        case 'webpack':
            return Bundler.Webpack;
        case 'both':
            return Bundler.Both;
        default:
            throw new Error('impossible!');
    }
}
function toModeEnum(mode) {
    switch (mode) {
        case 'npm':
            return Mode.Npm;
        case 'local':
            return Mode.Local;
        default:
            throw new Error('impossible');
    }
}
/**
 *
 * @param input
 * @returns - an array of error messages. Empty if the bundle definition is valid
 */
function parseBundleDefinition(input) {
    const bundleDefinitions = JSON.parse(input);
    const errorMessages = [];
    if (!Array.isArray(bundleDefinitions)) {
        throw new Error('Bundle definition must be defined in an array');
    }
    for (let i = 0; i < bundleDefinitions.length; i++) {
        const bundleDefinition = bundleDefinitions[i];
        if (!bundleDefinition.name) {
            errorMessages.push(`Missing field 'name' in the ${util.ordinal(i + 1)} bundle definition`);
        }
        if (!bundleDefinition.dependencies) {
            errorMessages.push(`Missing field 'dependencies' in the ${util.ordinal(i + 1)} bundle definition`);
        }
        if (!Array.isArray(bundleDefinition.dependencies)) {
            errorMessages.push(`Expecting an array for field 'dependencies', but it is not an array in the ${util.ordinal(i + 1)} bundle definition`);
        }
        for (let j = 0; j < bundleDefinition.dependencies.length; j++) {
            const dependency = bundleDefinition.dependencies[j];
            if (!dependency.packageName) {
                errorMessages.push(`Missing field 'packageName' in the ${util.ordinal(j + 1)} dependency of the ${util.ordinal(i + 1)} bundle definition`);
            }
            if (!dependency.imports) {
                errorMessages.push(`Missing field 'imports' in the ${util.ordinal(j + 1)} dependency of the ${util.ordinal(i + 1)} bundle definition`);
            }
            if (!Array.isArray(dependency.imports)) {
                errorMessages.push(`Expecting an array for field 'imports', but it is not an array in the ${util.ordinal(j + 1)} dependency of the ${util.ordinal(i + 1)} bundle definition`);
            }
            if (!dependency.versionOrTag) {
                dependency.versionOrTag = 'latest';
            }
        }
    }
    if (errorMessages.length > 0) {
        throw new Error(errorMessages.join('\n'));
    }
    return bundleDefinitions;
}
async function analyze({ bundleDefinitions, bundler, output, mode, debug }) {
    const analyses = [];
    let debugOptions;
    if (debug) {
        const tmpDir = tmp.dirSync();
        debugOptions = {
            output: tmpDir.name
        };
    }
    for (const bundleDefinition of bundleDefinitions) {
        analyses.push(await analyzeBundle(bundleDefinition, bundler, mode, debugOptions));
    }
    fs.writeFileSync(output, JSON.stringify(analyses, null, 2), {
        encoding: 'utf-8'
    });
}
async function analyzeBundle(bundleDefinition, bundler, mode, debugOptions) {
    const analysis = {
        name: bundleDefinition.name,
        results: []
    };
    let moduleDirectory;
    let tmpDir;
    if (mode === Mode.Npm) {
        tmpDir = await setupTempProject(bundleDefinition);
        moduleDirectory = `${tmpDir.name}/node_modules`;
    }
    const entryFileContent = createEntryFileContent(bundleDefinition);
    switch (bundler) {
        case Bundler.Rollup:
        case Bundler.Webpack:
            analysis.results.push(await analyzeBundleWithBundler(bundleDefinition.name, entryFileContent, bundler, moduleDirectory, debugOptions));
            break;
        case Bundler.Both:
            analysis.results.push(await analyzeBundleWithBundler(bundleDefinition.name, entryFileContent, Bundler.Rollup, moduleDirectory, debugOptions));
            analysis.results.push(await analyzeBundleWithBundler(bundleDefinition.name, entryFileContent, Bundler.Webpack, moduleDirectory, debugOptions));
            break;
        default:
            throw new Error('impossible!');
    }
    if (tmpDir) {
        tmpDir.removeCallback();
    }
    return analysis;
}
/**
 * Create a temp project and install dependencies the bundleDefinition defines
 * @returns - the path to the temp project
 */
async function setupTempProject(bundleDefinition) {
    /// set up a temporary project to install dependencies
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    console.log(tmpDir.name);
    // create package.json
    const pkgJson = {
        name: 'size-analysis',
        version: '0.0.0',
        dependencies: {}
    };
    for (const dep of bundleDefinition.dependencies) {
        pkgJson.dependencies[dep.packageName] = dep.versionOrTag;
    }
    fs.writeFileSync(`${tmpDir.name}/package.json`, `${JSON.stringify(pkgJson, null, 2)}\n`, { encoding: 'utf-8' });
    // install dependencies
    await childProcessPromise.spawn('npm', ['install'], {
        cwd: tmpDir.name,
        stdio: 'inherit'
    });
    return tmpDir;
}
async function analyzeBundleWithBundler(bundleName, entryFileContent, bundler, moduleDirectory, debugOptions) {
    let bundledContent = '';
    // bundle using bundlers
    if (bundler === Bundler.Rollup) {
        bundledContent = await bundleWithRollup(entryFileContent, moduleDirectory);
    }
    else {
        bundledContent = await bundleWithWebpack(entryFileContent, moduleDirectory);
    }
    const minifiedBundle = await minify(bundledContent);
    const { size, gzipSize } = calculateContentSize(minifiedBundle);
    const analysisResult = {
        bundler,
        size,
        gzipSize
    };
    if (debugOptions) {
        const bundleFilePath = `${debugOptions.output}/${bundleName.replace(/ +/g, '-')}.${bundler}.js`;
        const minifiedBundleFilePath = `${debugOptions.output}/${bundleName.replace(/ +/g, '-')}.${bundler}.minified.js`;
        fs.writeFileSync(bundleFilePath, bundledContent, { encoding: 'utf8' });
        fs.writeFileSync(minifiedBundleFilePath, minifiedBundle, { encoding: 'utf8' });
        analysisResult.debugInfo = {
            pathToBundle: bundleFilePath,
            pathToMinifiedBundle: minifiedBundleFilePath,
            dependencies: extractDeclarations(bundleFilePath)
        };
    }
    return analysisResult;
}
function createEntryFileContent(bundleDefinition) {
    const contentArray = [];
    // cache used symbols. Used to avoid symbol collision when multiple modules export symbols with the same name.
    const symbolsCache = new Set();
    for (const dep of bundleDefinition.dependencies) {
        for (const imp of dep.imports) {
            if (typeof imp === 'string') {
                contentArray.push(...createImportExport(imp, dep.packageName, symbolsCache));
            }
            else {
                // submodule imports
                for (const subImp of imp.imports) {
                    contentArray.push(...createImportExport(subImp, `${dep.packageName}/${imp.path}`, symbolsCache));
                }
            }
        }
    }
    return contentArray.join('\n');
}
function createImportExport(symbol, modulePath, symbolsCache) {
    const contentArray = [];
    switch (symbol) {
        case SpecialImport.Default: {
            const nameToUse = createSymbolName('default_import', symbolsCache);
            contentArray.push(`import ${nameToUse} from '${modulePath}';`);
            contentArray.push(`console.log(${nameToUse})`); // prevent import from being tree shaken
            break;
        }
        case SpecialImport.Namespace: {
            const nameToUse = createSymbolName('namespace', symbolsCache);
            contentArray.push(`import * as ${nameToUse} from '${modulePath}';`);
            contentArray.push(`console.log(${nameToUse})`); // prevent import from being tree shaken
            break;
        }
        case SpecialImport.Sizeeffect:
            contentArray.push(`import '${modulePath}';`);
            break;
        default:
            // named imports
            const nameToUse = createSymbolName(symbol, symbolsCache);
            if (nameToUse !== symbol) {
                contentArray.push(`export {${symbol} as ${nameToUse}} from '${modulePath}';`);
            }
            else {
                contentArray.push(`export {${symbol}} from '${modulePath}';`);
            }
    }
    return contentArray;
}
/**
 * In case a symbol with the same name is already imported from another module, we need to give this symbol another name
 * using "originalname as anothername" syntax, otherwise it returns the original symbol name.
 */
function createSymbolName(symbol, symbolsCache) {
    let nameToUse = symbol;
    const max = 100;
    while (symbolsCache.has(nameToUse)) {
        nameToUse = `${symbol}_${Math.floor(Math.random() * max)}`;
    }
    symbolsCache.add(nameToUse);
    return nameToUse;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const projectRoot$1 = path.dirname(path.resolve(__dirname, '../package.json'));
/**
 * Entry Point of the Tool.
 * The function first checks if it's an adhoc run (by checking whether --inputDtsFile and --inputBundle are both enabled)
 * The function then checks whether --inputModule flag is specified; Run analysis on all modules if not, run analysis on selected modules if enabled.
 * Throw INVALID_FLAG_COMBINATION error if neither case fulfill.
 */
async function analyzePackageSize(argv) {
    // check if it's an adhoc run
    // adhoc run report can only be redirected to files
    if (argv.inputDtsFile && argv.inputBundleFile && argv.output) {
        const jsonReport = await generateReport('adhoc', argv.inputDtsFile, argv.inputBundleFile);
        writeReportToFile(jsonReport, path.resolve(argv.output));
    }
    else if (!argv.inputDtsFile && !argv.inputBundleFile) {
        // retrieve All Module Names
        // TODO: update the workspace once exp packages are officially released
        let allModulesLocation = await mapWorkspaceToPackages([
            `${projectRoot$1}/packages-exp/*`
        ]);
        allModulesLocation = allModulesLocation.filter(path => {
            const json = JSON.parse(fs.readFileSync(`${path}/package.json`, { encoding: 'utf-8' }));
            return (json.name.startsWith('@firebase') &&
                !json.name.includes('-compat') &&
                !json.name.includes('-types'));
        });
        if (argv.inputModule) {
            allModulesLocation = allModulesLocation.filter(path => {
                const json = JSON.parse(fs.readFileSync(`${path}/package.json`, { encoding: 'utf-8' }));
                return argv.inputModule.includes(json.name);
            });
        }
        let writeFiles = false;
        if (argv.output) {
            writeFiles = true;
        }
        const reports = await generateReportForModules(allModulesLocation);
        if (writeFiles) {
            for (const report of reports) {
                writeReportToDirectory(report, `${path.basename(report.name)}-dependencies.json`, path.resolve(argv.output));
            }
        }
    }
    else {
        throw new Error("Invalid command flag combinations!" /* INVALID_FLAG_COMBINATION */);
    }
}
function mapWorkspaceToPackages(workspaces) {
    return Promise.all(workspaces.map(workspace => new Promise(resolve => {
        glob__default['default'](workspace, (err, paths) => {
            if (err)
                throw err;
            resolve(paths);
        });
    }))).then(paths => paths.reduce((arr, val) => arr.concat(val), []));
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// eslint-disable-next-line no-unused-expressions
yargs.command('$0', 'Analyze the size of individual exports from packages', {
    inputModule: {
        type: 'array',
        alias: 'im',
        desc: 'The name of the module(s) to be analyzed. example: --inputModule "@firebase/functions-exp" "firebase/auth-exp"'
    },
    inputDtsFile: {
        type: 'string',
        alias: 'if',
        desc: 'support for adhoc analysis. requires a path to a d.ts file'
    },
    inputBundleFile: {
        type: 'string',
        alias: 'ib',
        desc: 'support for adhoc analysis. requires a path to a bundle file'
    },
    output: {
        type: 'string',
        alias: 'o',
        required: true,
        desc: 'The location where report(s) will be generated, a directory path if module(s) are analyzed; a file path if ad hoc analysis is to be performed'
    }
}, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
args => analyzePackageSize(args).catch(e => console.log(e)))
    .command('bundle', 'Analyze bundle size', {
    input: {
        type: 'string',
        alias: 'i',
        required: true,
        desc: 'Path to the JSON file that describes the bundles to be analyzed'
    },
    mode: {
        choices: ['npm', 'local'],
        alias: 'm',
        default: 'npm',
        desc: 'Use Firebase packages from npm or the local repo'
    },
    bundler: {
        choices: ['rollup', 'webpack', 'both'],
        alias: 'b',
        default: 'rollup',
        desc: 'The bundler(s) to be used'
    },
    output: {
        type: 'string',
        alias: 'o',
        default: './size-analysis-bundles.json',
        desc: 'The output location'
    },
    debug: {
        type: 'boolean',
        alias: 'd',
        default: false,
        desc: 'debug mode'
    }
}, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
argv => run(argv))
    .help().argv;
