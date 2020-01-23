"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const concourseOutline_1 = require("./concourseOutline");
function activate(context) {
    const consourseOutlineProvider = new concourseOutline_1.ConsourseOutlineProvider(context);
    vscode.window.registerTreeDataProvider('consourseOutline', consourseOutlineProvider);
    // vscode.commands.registerCommand('jsonOutline.refresh', () => jsonOutlineProvider.refresh());
    // vscode.commands.registerCommand('jsonOutline.refreshNode', offset => jsonOutlineProvider.refresh(offset));
    // vscode.commands.registerCommand('jsonOutline.renameNode', offset => jsonOutlineProvider.rename(offset));
    // vscode.commands.registerCommand('extension.openJsonSelection', range => jsonOutlineProvider.select(range));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map