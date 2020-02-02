"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const concourseOutline_1 = require("./concourseOutline");
function activate(context) {
    new concourseOutline_1.ConsourseOutlineView(context);
    // vscode.window.registerTreeDataProvider('consourseOutline', consourseOutlineProvider);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map