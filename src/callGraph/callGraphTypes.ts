import { Interface } from 'mocha';
import * as vscode from 'vscode';


export interface SymbolInfo {
    id: string,
    name: string;
    kind: vscode.SymbolKind,
    type: string;
    path: string;

    start_line: number;
    start_character: number;
    end_line: number;
    end_character: number;
    
    selection_start_line: number;
    selection_start_character: number;
    selection_end_line: number;
    selection_end_character: number;

    callSymbolIds: string[];

    parentFileId: string;
    parentSymbolId: string;
    childSymbolIds: string[];
}


export interface FileInfo {
    id: string;
    name: string;
    type: string;
    path: string;

    childSymbolIds: string[];
    parentModuleId: string;

    callFileIds: string[];
}


export interface ModuleInfo {
    id: string;
    name: string;
    path: string;

    childFileIds: string[];
    childModuleIds: string[];

    parentModuleId: string;

    callModuleIds: string[];

    isRoot: boolean
}


export interface RepoInfo {
    id: string,
    name: string,
    path: string,

    rootModule: ModuleInfo;

    modules: {
        [id: string]: ModuleInfo;
    };
    files: {
        [id: string]: FileInfo;
    }
    symbols: {
        [id: string]: SymbolInfo;
    };
}


export interface RepoConfigSaveGraph {
    symbol_graph?: string,
    file_graph?: string,
    module_graph?: string
}

export interface RepoConfig {
    fileTypes: string[];
    ignores: string[];

    save_graph: RepoConfigSaveGraph,
    save_json: string;
}


export const SYMBOLS_SET = new Set([
    vscode.SymbolKind.Function,
    vscode.SymbolKind.Class,
    vscode.SymbolKind.Method,
    vscode.SymbolKind.Interface,
    vscode.SymbolKind.Namespace,
    vscode.SymbolKind.Struct,
]);


export function getModule(repoInfo: RepoInfo, mid: string): ModuleInfo {
    if (repoInfo.rootModule.id === mid) {
        return repoInfo.rootModule;
    } else {
        return repoInfo.modules[mid];
    }
}


export const SymbolTypes = {
    /**
     * The `File` symbol kind.
     */
    0: 'File',
    /**
     * The `Module` symbol kind.
     */
    1: 'Module',
    /**
     * The `Namespace` symbol kind.
     */
    2: 'Namespace',
    /**
     * The `Package` symbol kind.
     */
    3: 'Package',
    /**
     * The `Class` symbol kind.
     */
    4: 'Class',
    /**
     * The `Method` symbol kind.
     */
    5: 'Method',
    /**
     * The `Property` symbol kind.
     */
    6: 'Property',
    /**
     * The `Field` symbol kind.
     */
    7: 'Field',
    /**
     * The `Constructor` symbol kind.
     */
    8: 'Constructor',
    /**
     * The `Enum` symbol kind.
     */
    9: 'Enum',
    /**
     * The `Interface` symbol kind.
     */
    10: 'Interface',
    /**
     * The `Function` symbol kind.
     */
    11: 'Function',
    /**
     * The `Variable` symbol kind.
     */
    12: 'Variable',
    /**
     * The `Constant` symbol kind.
     */
    13: 'Constant',
    /**
     * The `String` symbol kind.
     */
    14: 'String',
    /**
     * The `Number` symbol kind.
     */
    15: 'Number',
    /**
     * The `Boolean` symbol kind.
     */
    16: 'Boolean',
    /**
     * The `Array` symbol kind.
     */
    17: 'Array',
    /**
     * The `Object` symbol kind.
     */
    18: 'Object',
    /**
     * The `Key` symbol kind.
     */
    19: 'Key',
    /**
     * The `Null` symbol kind.
     */
    20: 'Null',
    /**
     * The `EnumMember` symbol kind.
     */
    21: 'EnumMember',
    /**
     * The `Struct` symbol kind.
     */
    22: 'Struct',
    /**
     * The `Event` symbol kind.
     */
    23: 'Event',
    /**
     * The `Operator` symbol kind.
     */
    24: 'Operator',
    /**
     * The `TypeParameter` symbol kind.
     */
    25: 'TypeParameter'
};


