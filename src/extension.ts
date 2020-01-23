import * as vscode from 'vscode';
import { ConsourseOutlineProvider } from './concourseOutline';
export function activate(context: vscode.ExtensionContext) {
	const consourseOutlineProvider = new ConsourseOutlineProvider(context);
	vscode.window.registerTreeDataProvider('consourseOutline', consourseOutlineProvider);
	// vscode.commands.registerCommand('jsonOutline.refresh', () => jsonOutlineProvider.refresh());
	// vscode.commands.registerCommand('jsonOutline.refreshNode', offset => jsonOutlineProvider.refresh(offset));
	// vscode.commands.registerCommand('jsonOutline.renameNode', offset => jsonOutlineProvider.rename(offset));
	// vscode.commands.registerCommand('extension.openJsonSelection', range => jsonOutlineProvider.select(range));

}

// this method is called when your extension is deactivated
export function deactivate() {}
