import { SymbolInfo, FileInfo, ModuleInfo, RepoInfo } from "./callGraphTypes";


class GraphNode {
    public id: string;
    public label: string;
    constructor(id: string, label: string) {
        this.id = id;
        this.label = label;
    }
}

class GraphEdge {
    public from: string;
    public to: string;
    public comments: string;
    constructor(from: string, to: string, comments: string) {
        this.from = from;
        this.to = to;
        this.comments = comments;
    }
}

class Graph {
    public id: string;
    public label: string;
    public nodes: GraphNode[];
    public edges: GraphEdge[];
    
    public subGraphs: Graph[];

    constructor(id: string, label: string) {
        this.id = id;
        this.label = label;
        this.nodes = [];
        this.edges = [];
        this.subGraphs = [];
    }
}


function makeModule(module: ModuleInfo, repoInfo: RepoInfo, level: string): Graph | GraphNode {
    if (level === 'module') {
        if (module.childModuleIds.length > 0) {
            const graph = new Graph(module.id, `Module: ${module.name}`);
            module.childModuleIds.forEach((mid) => {
                const childModule = repoInfo.modules[mid];
                const subModule = makeModule(childModule, repoInfo, level);
                if (subModule instanceof Graph) {
                    graph.subGraphs.push(subModule);
                } else {
                    graph.nodes.push(subModule);
                }
            });
            return graph;
        } else {
            const node = new GraphNode(module.id, `Module: ${module.name}`);
            return node;
        }
    } else {
        const graph = new Graph(module.id, `Module: ${module.name}`);
        module.childModuleIds.forEach((mid) => {
            const childModule = repoInfo.modules[mid];
            const subModule = makeModule(childModule, repoInfo, level);
            if (subModule instanceof Graph) {
                graph.subGraphs.push(subModule);
            }
        });
        if (level === 'file') {
            module.childFileIds.forEach((fid) => {
                const childFile = repoInfo.files[fid];
                const subFile = makeFile(childFile, repoInfo, level);
                if (subFile instanceof GraphNode) {
                    graph.nodes.push(subFile);
                }
            });
        } else if (level === 'symbol') {
            module.childFileIds.forEach((fid) => {
                const childFile = repoInfo.files[fid];
                const subFile = makeFile(childFile, repoInfo, level);
                if (subFile instanceof Graph) {
                    graph.subGraphs.push(subFile);
                }
            });
        }
        return graph;
    }
}


function makeFile(file: FileInfo, repoInfo: RepoInfo, level: string): Graph | GraphNode {
    if (level === 'symbol') {
        const graph: Graph = new Graph(file.id, `File: ${file.name}`);
    
        file.childSymbolIds.forEach((sid) => {
            const childSymbol = repoInfo.symbols[sid];
            graph.nodes.push(
                makeSymbol(childSymbol)
            );
        });
        return graph;

    } else if (level === 'file') {
        const node: GraphNode = new GraphNode(file.id, `File: ${file.name}`);
        return node;
    } else {
        throw new Error(`Invalid level: ${level}`);
    }
}

function makeSymbol(symbol: SymbolInfo): GraphNode {
    const node: GraphNode = {
        id: symbol.id,
        label: `${symbol.type}: ${symbol.name}`,
    };
    return node;
}


const PRE_SPACE = '    ';


function graphToDotString(graph: Graph) : string {
    let pre_space = PRE_SPACE;
    let dot = `digraph G {\n`;

    graph.nodes.forEach((node) => {
        dot += pre_space + `"${node.id}" [label = "${node.label}"];\n`;
    });

    dot += subGraphToDotString(graph, pre_space);

    graph.edges.forEach((edge) => {
        dot += pre_space + `"${edge.from}" -> "${edge.to}" [${edge.comments}];\n`;
    });

    dot += '}\n';
    return dot;
}


function subGraphToDotString(
    subGraph: Graph,
    pre_space: string
) : string {
    let dot = '';
    dot += pre_space + `subgraph "cluster_${subGraph.id}" {\n`;
    dot += pre_space + PRE_SPACE + `label = "${subGraph.label}";\n`;

    subGraph.nodes.forEach((node) => {
        dot += pre_space + PRE_SPACE + `"${node.id}" [label="${node.label}"];\n`;
    });

    subGraph.subGraphs.forEach((subSubGraph) => {
        dot += subGraphToDotString(subSubGraph, pre_space + PRE_SPACE);
    });

    dot += pre_space + '}\n';

    return dot;
}


export function generateGraph(repoInfo: RepoInfo, level: string): string {
    const graph = makeModule(repoInfo.rootModule, repoInfo, level);
    if (graph instanceof GraphNode) {
        throw new Error("Root module must be a graph.");
    }

    // add edges
    if (level === 'symbol') {
        for (const symbol of Object.values(repoInfo.symbols)){
            // add call
            symbol.callSymbolIds.forEach((callId) => {
                const callEdge: GraphEdge = {
                    from: symbol.id,
                    to: callId,
                    comments: ""
                };
                graph.edges.push(callEdge);
            });

            // all include
            if (symbol.parentSymbolId !== "") {
                const incEdge: GraphEdge = {
                    from: symbol.id,
                    to: symbol.parentSymbolId,
                    comments: "style=dashed"
                };
                graph.edges.push(incEdge);
            }
        }
    } else if (level === 'file') {
        for (const file of Object.values(repoInfo.files)){
            // add call
            file.callFileIds.forEach((callId) => {
                const callEdge: GraphEdge = {
                    from: file.id,
                    to: callId,
                    comments: ""
                };
                graph.edges.push(callEdge);
            });
        }
    } else if (level === 'module') {
        for (const module of Object.values(repoInfo.modules)){
            // add call
            module.callModuleIds.forEach((callId) => {
                const callEdge: GraphEdge = {
                    from: module.id,
                    to: callId,
                    comments: ""
                };
                graph.edges.push(callEdge);
            });
        }
    }

    const dotString = graphToDotString(graph);
    return dotString;
}
