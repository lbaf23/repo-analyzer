import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { readFile } from './utils';
import { FileInfo, ModuleInfo, RepoInfo, SymbolInfo } from './repoTypes';


export class SQLite3DB {
    private dbPath: string;
    private db: Database | undefined;

    public constructor(dbPath: string) {
        this.dbPath = dbPath;
        this.db = undefined;
    }

    public async open() {
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
    }

    public async close() {
        await this.db?.close();
    }

    public async createTables(sql_path: string) {
        const sql: string = await readFile(sql_path);
        await this.db?.exec(sql);
    }

    public async updateRepoInfo(repoInfo: RepoInfo) {
        const sql = `
INSERT OR REPLACE INTO
repo (id, name, path, rootModuleId)
VALUES (?, ?, ?, ?);
`;

        await this.db?.run(sql, [
            repoInfo.id,
            repoInfo.name,
            repoInfo.path,
            repoInfo.rootModule.id
        ]);
    }

    public async insertModule(moduleInfo: ModuleInfo) {
        const sql = `
INSERT OR REPLACE INTO
modules (id, name, path, parentModuleId, isRoot)
VALUES (?, ?, ?, ?, ?);
`;
        await this.db?.run(sql, [
            moduleInfo.id,
            moduleInfo.name,
            moduleInfo.path,
            moduleInfo.parentModuleId,
            moduleInfo.isRoot
        ]);
        
    }

    public async insertFile(fileInfo: FileInfo) {
        const sql = `
INSERT OR REPLACE INTO
files (id, name, type, path, parentModuleId)
VALUES (?, ?, ?, ?, ?);
`;
        await this.db?.run(sql, [
            fileInfo.id,
            fileInfo.name,
            fileInfo.type,
            fileInfo.path,
            fileInfo.parentModuleId
        ]);
    }

    public async insertSymbol(symbolInfo: SymbolInfo) {
        const sql = `
INSERT OR REPLACE INTO
symbols (
    id,
    name,
    kind,
    type, 
    path, 
    
    start_line, 
    start_character, 
    end_line, 
    end_character, 
    
    selection_start_line, 
    selection_start_character,
    selection_end_line,
    selection_end_character,
    
    parentFileId,
    parentSymbolId
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;
        await this.db?.run(sql, [
            symbolInfo.id,
            symbolInfo.name,
            symbolInfo.kind,
            symbolInfo.type,
            symbolInfo.path,

            symbolInfo.start_line,
            symbolInfo.start_character,
            symbolInfo.end_line,
            symbolInfo.end_character,

            symbolInfo.selection_start_line,
            symbolInfo.selection_start_character,
            symbolInfo.selection_end_line,
            symbolInfo.selection_end_character,

            symbolInfo.parentFileId,
            symbolInfo.parentSymbolId
        ]);
    }

    public async insertModuleInModule(moduleId: string, childModuleId: string) {
        const sql = "INSERT OR REPLACE INTO modulesInModule (moduleId, childModuleId) VALUES (?, ?);";
        await this.db?.run(sql, [moduleId, childModuleId]);
    }

    public async insertFileInModule(moduleId: string, childFileId: string) {
        const sql = "INSERT OR REPLACE INTO filesInModule (moduleId, childFileId) VALUES (?, ?);";
        await this.db?.run(sql, [moduleId, childFileId]);
    }

    public async insertSymbolInFile(fileId: string, childSymbolId: string) {
        const sql = "INSERT OR REPLACE INTO symbolsInFile (fileId, childSymbolId) VALUES (?, ?);";
        await this.db?.run(sql, [fileId, childSymbolId]);
    }

    public async insertSymbolInSymbol(symbolId: string, childSymbolId: string) {
        const sql = "INSERT OR REPLACE INTO symbolsInSymbol (symbolId, childSymbolId) VALUES (?, ?);";
        await this.db?.run(sql, [symbolId, childSymbolId]);
    }

    public async insertSymbolCallSymbol(symbolId: string, callSymbolId: string) {
        const sql = "INSERT OR REPLACE INTO symbolCallSymbols (symbolId, callSymbolId) VALUES (?, ?);";
        await this.db?.run(sql, [symbolId, callSymbolId]);
    }

    public async insertFileCallFile(fileId: string, callFileId: string) {
        const sql = "INSERT OR REPLACE INTO fileCallFiles (fileId, callFileId) VALUES (?, ?);";
        await this.db?.run(sql, [fileId, callFileId]);
    }

    public async insertModuleCallModule(moduleId: string, callModuleId: string) {
        const sql = "INSERT OR REPLACE INTO moduleCallModules (moduleId, callModuleId) VALUES (?, ?);";
        await this.db?.run(sql, [moduleId, callModuleId]);
    }

    /** Find info */
    // public async getRootModule(): Promise<ModuleInfo> {
    //     const module = await this.db?.get("SELECT * FROM modules WHERE isRoot = true") as ModuleInfo;
    //     const childModuleIds = await this.db?.get("SELECT * FROM modulesInModule WHERE moduleId = ?", [module.id]) as string[];
    //     const childFileIds = await this.db?.get("SELECT * FROM filesInModule WHERE moduleId = ?", [module.id]) as string[];
    //     const callModuleIds = await this.db?.get("SELECT * FROM moduleCallModules WHERE moduleId = ?", [module.id]) as string[];

    //     module.childFileIds = childFileIds;
    //     module.childModuleIds = childModuleIds;
    //     module.callModuleIds = callModuleIds;
    //     return module;
    // }

    // public async getModule(moduleId: string): Promise<ModuleInfo> {
    //     const module = await this.db?.get("SELECT * FROM modules WHERE id = ?", [moduleId]) as ModuleInfo;
    //     const childModuleIds = await this.db?.get("SELECT * FROM modulesInModule WHERE moduleId = ?", [module.id]) as string[];
    //     const childFileIds = await this.db?.get("SELECT * FROM filesInModule WHERE moduleId = ?", [module.id]) as string[];
    //     const callModuleIds = await this.db?.get("SELECT * FROM moduleCallModules WHERE moduleId = ?", [module.id]) as string[];

    //     module.childFileIds = childFileIds;
    //     module.childModuleIds = childModuleIds;
    //     module.callModuleIds = callModuleIds;
    //     return module;
    // }

    // public async getFile(fileId: string): Promise<FileInfo> {
    //     const file = this.db?.get("SELECT * FROM files WHERE id = ?", [fileId]) as FileInfo;
    //     const childSymbolIds = this.db?.get("SELECT * FROM symbolsInFile WHERE fileId = ?", [fileId]) as string[];
    //     const callFileIds = this.db?.get("SELECT * FROM fileCallFiles WHERE fileId = ?", [fileId]) as string[];

    //     file.childSymbolIds = childSymbolIds;
    //     file.callFileIds = callFileIds;
    //     return file;
    // }

    // public async getSymbol(symbolId: string): Promise<SymbolInfo> {
    //     if (this.db) {
    //         const res = this.db.get("SELECT * FROM symbols WHERE id = ?", [symbolId]);
    //         const resChildSymbolIds = this.db.all("SELECT * FROM symbolsInSymbol WHERE symbolId = ?", [symbolId]);
    //         const resCallSymbolIds = this.db.all("SELECT * FROM symbolCallSymbols WHERE symbolId = ?", [symbolId]);

    //         if (res) {
    //             const symbol: SymbolInfo = {
    //                 id: res.id,
    //                 name: res.name,
    //             };

    //             symbol.childSymbolIds = childSymbolIds;
    //             symbol.callSymbolIds = callSymbolIds;
    //             return symbol;
    //         }
    //     }
    //     throw new Error("database not open");
    // }
}
