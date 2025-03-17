// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateCallGraph } from './callGraph/generateCallGraph';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "repo-analyzer" is now active!');

	const disposable = vscode.commands.registerCommand('repo-analyzer.generateCallGraph', async () => {
		await generateCallGraph();
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
