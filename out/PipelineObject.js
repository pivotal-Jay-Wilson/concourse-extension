"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
class PipelineObject extends vscode.TreeItem {
    constructor(label, collapsibleState, target, paused = false, status = 'null', contextValue = 'pipeline', url = '', command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.target = target;
        this.paused = paused;
        this.status = status;
        this.contextValue = contextValue;
        this.url = url;
        this.command = command;
        let icon = 'dependency.svg';
        switch (contextValue) {
            case 'target':
                icon = 'dependency.svg';
                break;
            case 'pipeline':
                if (paused) {
                    icon = 'pause.svg';
                }
                else {
                    icon = 'play.svg';
                }
                break;
            case 'job':
                switch (status) {
                    case 'succeeded':
                        icon = 'check_box.svg';
                        break;
                    case 'failed':
                        icon = 'check_box_outline_blank.svg';
                        break;
                    case "aborted":
                        icon = 'error.svg';
                        break;
                    case "started":
                        icon = 'run.svg';
                        break;
                    case "pending":
                        icon = 'pause.svg';
                        break;
                    case "paused":
                        icon = 'pause.svg';
                        break;
                    case 'null':
                        icon = 'indeterminate_check_box.svg';
                        break;
                }
                break;
            case 'build':
                switch (status) {
                    case 'succeeded':
                        icon = 'build-g.svg';
                        break;
                    case 'aborted':
                        icon = 'build-b.svg';
                        break;
                    case 'started':
                        icon = 'build-y.svg';
                        break;
                    case 'pending':
                        icon = 'build-gr.svg';
                        break;
                    default:
                        icon = 'build-g.svg';
                        break;
                }
            default:
                break;
        }
        this.iconPath = {
            light: path.join(__filename, '..', '..', 'resources', 'light', icon),
            dark: path.join(__filename, '..', '..', 'resources', 'dark', icon)
        };
    }
    get tooltip() {
        return `${this.label}`;
    }
}
exports.PipelineObject = PipelineObject;
//# sourceMappingURL=PipelineObject.js.map