CREATE TABLE IF NOT EXISTS repo (
    id TEXT PRIMARY KEY,
    name TEXT,
    path TEXT,
    
    rootModuleId TEXT
);


CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    name TEXT,
    path TEXT,

    parentModuleId TEXT,
    isRoot BOOLEAN
);
CREATE INDEX IF NOT EXISTS idx_modules_parentModuleId ON modules(parentModuleId);


CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    path TEXT,

    parentModuleId TEXT
);
CREATE INDEX IF NOT EXISTS idx_files_parentModuleId ON files(parentModuleId);


CREATE TABLE IF NOT EXISTS symbols (
    id TEXT PRIMARY KEY,
    name TEXT,
    kind INTEGER,
    type TEXT,
    path TEXT,

    start_line INTEGER,
    start_character INTEGER,
    end_line INTEGER,
    end_character INTEGER,
    
    selection_start_line INTEGER,
    selection_start_character INTEGER,
    selection_end_line INTEGER,
    selection_end_character INTEGER,
    
    parentFileId TEXT,
    parentSymbolId TEXT
);
CREATE INDEX IF NOT EXISTS idx_symbols_parentFileId ON symbols(parentFileId);
CREATE INDEX IF NOT EXISTS idx_symbols_parentSymbolId ON symbols(parentSymbolId);


CREATE TABLE IF NOT EXISTS modulesInModule (
    moduleId TEXT,
    childModuleId TEXT,
    PRIMARY KEY (moduleId, childModuleId)
);
CREATE INDEX IF NOT EXISTS idx_modulesInModule_childModuleId ON modulesInModule(childModuleId);


CREATE TABLE IF NOT EXISTS filesInModule (
    moduleId TEXT,
    childFileId TEXT,
    PRIMARY KEY (moduleId, childFileId)
);
CREATE INDEX IF NOT EXISTS idx_filesInModule_childFileId ON filesInModule(childFileId);


CREATE TABLE IF NOT EXISTS symbolsInFile (
    fileId TEXT,
    childSymbolId TEXT,
    PRIMARY KEY (fileId, childSymbolId)
);
CREATE INDEX IF NOT EXISTS idx_symbolsInFile_childSymbolId ON symbolsInFile(childSymbolId);


CREATE TABLE IF NOT EXISTS symbolsInSymbol (
    symbolId TEXT,
    childSymbolId TEXT,
    PRIMARY KEY (symbolId, childSymbolId)
);
CREATE INDEX IF NOT EXISTS idx_symbolsInSymbol_childSymbolId ON symbolsInSymbol(childSymbolId);


CREATE TABLE IF NOT EXISTS symbolCallSymbols (
    symbolId TEXT,
    callSymbolId TEXT,
    PRIMARY KEY (symbolId, callSymbolId)
);
CREATE INDEX IF NOT EXISTS idx_symbolCallSymbols_callSymbolId ON symbolCallSymbols(callSymbolId);


CREATE TABLE IF NOT EXISTS fileCallFiles (
    fileId TEXT,
    callFileId TEXT,
    PRIMARY KEY (fileId, callFileId)
);
CREATE INDEX IF NOT EXISTS idx_fileCallFiles_callFileId ON fileCallFiles(callFileId);


CREATE TABLE IF NOT EXISTS moduleCallModules (
    moduleId TEXT,
    callModuleId TEXT,
    PRIMARY KEY (moduleId, callModuleId)
);
CREATE INDEX IF NOT EXISTS idx_moduleCallModules_callModuleId ON moduleCallModules(callModuleId);
