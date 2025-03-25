import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import ignore, { Ignore } from 'ignore';
import { FileInfo, ModuleInfo, SymbolInfo, SymbolTypes, RepoConfig, RepoInfo, getModule, SYMBOLS_SET } from './repoTypes';
import { generateGraph } from './buildGraph';
import { readFile, writeFile, extractFileType, checkFileExists } from './utils';
import { SQLite3DB } from './sqliteUtils';


// async function waitForInitialDiagnostics(document: vscode.TextDocument): Promise<void> {
//     return new Promise((resolve) => {
//         // Listen for diagnostics changes for this document
//         const listener = vscode.languages.onDidChangeDiagnostics((e) => {

//             // if (e.uris.some(uri => uri.toString() === document.uri.toString())) {
//             listener.dispose();
//             resolve();
//             // }
//         });
//         // Check if diagnostics are already available
//         if (vscode.languages.getDiagnostics(document.uri).length > 0) {
//             listener.dispose();
//             resolve();
//         }
//         // Optional: Add a timeout to avoid hanging indefinitely
//         // setTimeout(() => {
//         //     listener.dispose();
//         //     resolve();
//         // }, 10000); // 10-second timeout as a fallback
//     });
// }


async function retryCommand<T>(
    retries: number,
    wait: number,
    command: string,
    ...args: any[]
): Promise<T | undefined> {
    let res: T | undefined;
    let r = 0;
    while (r < retries) {
        res = await vscode.commands.executeCommand<T>(
            command,
            ...args
        );
        if (res !== undefined) {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, wait));
        r ++;
        console.log(`retry ...`);
    }
    return res;
}


export async function generateCallGraph(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Repo Analyzer Output');
    outputChannel.show();

    // load workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        const msg = 'No repository is open.';
        vscode.window.showErrorMessage(msg);
        outputChannel.appendLine(msg);
        return;
    }

    const repoPath = workspaceFolders[0].uri.fsPath;
    const absPath: string = path.resolve(repoPath);
    const name: string = path.basename(absPath);

    let repoConfig: RepoConfig = {
        fileTypes: [
            ".py"
        ],
        ignores: [
            ".*",
            "**/__pycache__",
            "**/node_modules",
        ],
        save_graph: {
            symbol_graph: "call_graph_symbol.dot",
            file_graph: "call_graph_file.dot",
            module_graph: "call_graph_module.dot"
        },
        db: "repo.db",
        save_json: "call_graph.json",
    };
    const repoConfigPath = path.join(repoPath, '.repoconfig.json');
    if (await checkFileExists(repoConfigPath)) {
        const content = await readFile(repoConfigPath);
        repoConfig = JSON.parse(content);
        outputChannel.appendLine(`Read repo config: ${content}`);
    }

    const dbPath = path.join(repoPath, repoConfig.db);
    const db = new SQLite3DB(dbPath);
    await db.open();
    const sql_path = path.join(context.extensionPath, 'resources', 'createTables.sql');

    await db.createTables(sql_path);

    const rootModule: ModuleInfo = {
        id: "/",
        name: name,
        path: absPath,

        childFileIds: [],
        childModuleIds: [],
        parentModuleId: "",

        callModuleIds: [],
        isRoot: true
    };
    const repoInfo: RepoInfo = {
        id: name,
        name: name,
        path: absPath,

        rootModule: rootModule,

        modules: {},
        files: {},
        symbols: {}
    };

    await db.insertModule(rootModule);
    await db.updateRepoInfo(repoInfo);

    let msg: string = `Start generating call graph for repository ${repoPath}.`;
    vscode.window.showInformationMessage(msg);
    outputChannel.appendLine(msg);

    // resolve all files and dirs
    await findFilesAndModules(repoConfig, repoInfo, rootModule, repoPath, outputChannel, db);

    const total_files = Object.keys(repoInfo.files).length;
    let read_files = 1;
    // resolve symbols

    for (const file of Object.values(repoInfo.files)) {
        outputChannel.appendLine(`>>> Read file ${read_files}/${total_files} ${file.path}`);
        const document = await vscode.workspace.openTextDocument(
            vscode.Uri.file(file.path)
        );

        const symbols = await retryCommand<vscode.DocumentSymbol[]>(
            20,
            500,
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (symbols === undefined) {
            outputChannel.appendLine(`resolve failed.`);
            continue;
        }

        outputChannel.appendLine(`get ${symbols.length} symbols.`);
        await resolveFileSymbols(symbols, repoInfo, file, null, db);

        read_files ++;
    }

    const total_symbols = Object.keys(repoInfo.symbols).length;
    let read_symbols = 1;
    // resolve reference
    for (const symbol of Object.values(repoInfo.symbols)) {
        outputChannel.appendLine(`>>> Resolve symbol ${read_symbols}/${total_symbols} ${symbol.id}`);

        const file: FileInfo = repoInfo.files[symbol.parentFileId];
        const document = await vscode.workspace.openTextDocument(
            vscode.Uri.file(file.path)
        );

        let references = await retryCommand<vscode.Location[]>(
            20,
            500,
            'vscode.executeReferenceProvider',
            document.uri,
            new vscode.Position(symbol.selection_start_line, symbol.selection_start_character),
            false,            
        );

        if (references === undefined) {
            outputChannel.appendLine(`resolve failed.`);
            continue;
        }

        references = references.filter(ref => 
            !(ref.uri.toString() === document.uri.toString() && 
                ref.range.start.line === symbol.selection_start_line && 
                ref.range.start.character === symbol.selection_start_character)
        );

        outputChannel.appendLine(`get ${references.length} references.`);

        for (const ref of references) {
            const fileId = path.relative(repoPath, ref.uri.fsPath);
            const refSymbol = findContainingSymbol(ref.range, repoInfo, fileId);

            outputChannel.appendLine(`ref: ${fileId} ${ref.range.start.line},${ref.range.start.character}-${ref.range.end.line},${ref.range.end.character}`);

            if (!refSymbol) {
                // Can't find the reference symbol !!!
                continue;
            } else {
                // add symbol call
                if (!refSymbol.callSymbolIds.includes(symbol.id)) {
                    refSymbol.callSymbolIds.push(symbol.id);

                    await db.insertSymbolCallSymbol(refSymbol.id, symbol.id);
                }

                // add file call
                const refFile = repoInfo.files[refSymbol.parentFileId];
                const depFile = repoInfo.files[symbol.parentFileId];
                if (!refFile.callFileIds.includes(depFile.id)) {
                    refFile.callFileIds.push(depFile.id);

                    await db.insertFileCallFile(refFile.id, depFile.id);
                }

                // add module call
                const refModule = getModule(repoInfo, refFile.parentModuleId);
                const depModule = getModule(repoInfo, depFile.parentModuleId);
                if (!refModule.callModuleIds.includes(depModule.id)) {
                    refModule.callModuleIds.push(depModule.id);

                    await db.insertModuleCallModule(refModule.id, depModule.id);
                }
            }
        }

        read_symbols ++;
    }

    // save result
    if (repoConfig.save_json && repoConfig.save_json !== "") {
        const outputPath = path.join(repoPath, repoConfig.save_json);
        await writeFile(outputPath, JSON.stringify(repoInfo, null, 4));
        msg = `Call graph generated successfully at ${outputPath}.`;
        vscode.window.showInformationMessage(msg);
        outputChannel.appendLine(msg);
    }

    // save dot
    if (repoConfig.save_graph) {
        if (repoConfig.save_graph.symbol_graph && repoConfig.save_graph.symbol_graph !== "") {
            outputChannel.appendLine(`Start generating symbol level call graph figure.`);
            const dotString: string = generateGraph(repoInfo, "symbol");
            const figurePath = path.join(repoPath, repoConfig.save_graph.symbol_graph);
            await writeFile(figurePath, dotString);
            outputChannel.appendLine(`Symbol level call graph figure generated successfully at ${figurePath}`);
        }
        if (repoConfig.save_graph.file_graph && repoConfig.save_graph.file_graph !== "") {
            outputChannel.appendLine(`Start generating file level call graph figure.`);
            const dotString: string = generateGraph(repoInfo, "file");
            const figurePath = path.join(repoPath, repoConfig.save_graph.file_graph);
            await writeFile(figurePath, dotString);
            outputChannel.appendLine(`File level call graph figure generated successfully at ${figurePath}`);
        }
        if (repoConfig.save_graph.module_graph && repoConfig.save_graph.module_graph !== "") {
            outputChannel.appendLine(`Start generating module level call graph figure.`);
            const dotString: string = generateGraph(repoInfo, "module");
            const figurePath = path.join(repoPath, repoConfig.save_graph.module_graph);
            await writeFile(figurePath, dotString);
            outputChannel.appendLine(`Module level call graph figure generated successfully at ${figurePath}`);
        }
    }


    await db.save();

    outputChannel.appendLine(`SQLite file save to ${dbPath}`);

    await db.close();
}


async function resolveFileSymbols(symbols: vscode.DocumentSymbol[], repoInfo: RepoInfo, parentFile: FileInfo, parentSymbol: SymbolInfo | null = null, db: SQLite3DB): Promise<void> {
    for (const symbol of symbols) {
        // skip symbols
        if (!SYMBOLS_SET.has(symbol.kind)) {
            continue;
        }

        const new_symbol: SymbolInfo = {
            id: `${parentFile.id}:(${symbol.range.start.line},${symbol.range.start.character})-(${symbol.range.end.line},${symbol.range.end.character})`,
            name: symbol.name,
            kind: symbol.kind,
            type: SymbolTypes[symbol.kind],

            path: parentFile.path,

            start_line: symbol.range.start.line,
            start_character: symbol.range.start.character,
            end_line: symbol.range.end.line,
            end_character: symbol.range.end.character,

            selection_start_line: symbol.selectionRange.start.line,
            selection_start_character: symbol.selectionRange.start.character,
            selection_end_line: symbol.selectionRange.end.line,
            selection_end_character: symbol.selectionRange.end.character,

            callSymbolIds: [],
            parentFileId: parentFile.id,
            parentSymbolId: parentSymbol === null ? "" : parentSymbol.id,
            childSymbolIds: []
        };

        await db.insertSymbol(new_symbol);
        await db.insertSymbolInFile(parentFile.id, new_symbol.id);

        if (parentSymbol !== null) {
            await db.insertSymbolInSymbol(parentSymbol.id, new_symbol.id);

            parentSymbol.childSymbolIds.push(new_symbol.id);
        }
        parentFile.childSymbolIds.push(new_symbol.id);

        repoInfo.symbols[new_symbol.id] = new_symbol;
        resolveFileSymbols(symbol.children, repoInfo, parentFile, new_symbol, db);
    }
}


async function findFilesAndModules(
    repoConfig: RepoConfig,
    repoInfo: RepoInfo,
    parentModule: ModuleInfo,
    repoPath: string,
    outputChannel: vscode.OutputChannel,
    db: SQLite3DB
): Promise<void> {
    const ig: Ignore = ignore().add(repoConfig.ignores);

    const entries = await fs.readdir(parentModule.path, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath: string = path.join(parentModule.path, entry.name);

        const absPath: string = path.resolve(fullPath);
        const relPath: string = path.relative(repoPath, fullPath);
        const name: string = path.basename(fullPath);

        if (ig.ignores(relPath)) {
            // ignore path
            continue;
        }

        outputChannel.appendLine(`Check path ${relPath}`);

        if (entry.isDirectory()) {
            outputChannel.appendLine(`Read dir ${relPath}`);

            // is module
            const new_module: ModuleInfo = {
                id: relPath,
                name: name,
                path: absPath,

                childFileIds: [],
                childModuleIds: [],

                parentModuleId: parentModule.id,

                callModuleIds: [],
                isRoot: false
            };

            await db.insertModule(new_module);
            await db.insertModuleInModule(parentModule.id, new_module.id);

            repoInfo.modules[new_module.id] = new_module;
            parentModule.childModuleIds.push(new_module.id);
            await findFilesAndModules(repoConfig, repoInfo, new_module, repoPath, outputChannel, db);
        } else {
            // is file
            const fileType = extractFileType(entry.name);
            if (repoConfig.fileTypes.includes(fileType)) {
                outputChannel.appendLine(`Read ${fileType} file ${relPath}`);

                const new_file: FileInfo = {
                    id: relPath,
                    name: name,
                    type: fileType,
                    path: absPath,

                    childSymbolIds: [],
                    parentModuleId: parentModule.id,

                    callFileIds: []
                };
                await db.insertFile(new_file);
                await db.insertFileInModule(parentModule.id, new_file.id);

                repoInfo.files[new_file.id] = new_file;
                parentModule.childFileIds.push(new_file.id);
            }
            else {
                // ignore file type
            }
        }
    }
}


function findContainingSymbol(refRange: vscode.Range, repoInfo: RepoInfo, fileId: string): SymbolInfo | undefined {
    let containingSymbol: SymbolInfo | undefined;
    let smallestRange: vscode.Range | undefined;

    const file = repoInfo.files[fileId];

    if (!file) {
        // can't find file !!!
        return undefined;
    }

    for (const symbolId of file.childSymbolIds) {
        const symbol = repoInfo.symbols[symbolId];
        const symbolRange = new vscode.Range(
            new vscode.Position(symbol.start_line, symbol.start_character),
            new vscode.Position(symbol.end_line, symbol.end_character),
        );
        if (rangeContains(
            symbolRange,
            refRange
        )) {
            if (!smallestRange || rangeContains(smallestRange, symbolRange)) {
                smallestRange = symbolRange;
                containingSymbol = symbol;
            }
        }
    }
    return containingSymbol;
}

function rangeContains(outer: vscode.Range, inner: vscode.Range): boolean {
    return outer.start.isBeforeOrEqual(inner.start) && outer.end.isAfterOrEqual(inner.end);
}

