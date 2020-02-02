import * as vscode from 'vscode';
import { ConsourseOutlineView } from './concourseOutline';
export function activate(context: vscode.ExtensionContext) {
	new ConsourseOutlineView(context);
	// vscode.window.registerTreeDataProvider('consourseOutline', consourseOutlineProvider);

}

export function deactivate() {}
