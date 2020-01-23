"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
//import * as json from 'jsonc-parser';
const path = require("path");
const yaml = require("js-yaml");
const fs = require("fs");
const os = require("os");
const axios_1 = require("axios");
class ConsourseOutlineProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        try {
            const home = os.homedir();
            const doc = yaml.safeLoad(fs.readFileSync(home + '/.flyrc', 'utf8'));
            console.log(doc);
            this.targets = new Map(Object.entries(doc.targets));
        }
        catch (e) {
            this.targets = new Map();
            console.log(e);
        }
    }
    rename(offset) {
    }
    getChildren(element) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __awaiter(this, void 0, void 0, function* () {
            let targetSets = new Set();
            if (!this.targets) {
                vscode.window.showInformationMessage('No .fryrc file. Log in with fly cli first');
                return Promise.resolve([]);
            }
            if (!element) {
                for (const [name, value] of this.targets) {
                    targetSets.add(new PipelineObject(name, vscode.TreeItemCollapsibleState.Collapsed, name, 0));
                    //console.log(target);
                }
            }
            else if (((_a = element) === null || _a === void 0 ? void 0 : _a.level) === 0) {
                const target = this.targets.get(element.label);
                let config = {
                    headers: {
                        'Authorization': 'Bearer ' + ((_b = target) === null || _b === void 0 ? void 0 : _b.token.value),
                        'Content-Type': 'application/json'
                    }
                };
                let query = `${(_c = target) === null || _c === void 0 ? void 0 : _c.api}/api/v1/teams/${(_d = target) === null || _d === void 0 ? void 0 : _d.team}/pipelines`;
                const response = yield axios_1.default.get(query, config);
                for (const data of response.data) {
                    targetSets.add(new PipelineObject(data.name, vscode.TreeItemCollapsibleState.Collapsed, element.target, 1, data.paused));
                    //console.log(target);
                }
                console.log(response);
            }
            else if (((_e = element) === null || _e === void 0 ? void 0 : _e.level) === 1) {
                const target = this.targets.get(element.target);
                let config = {
                    headers: {
                        'Authorization': 'Bearer ' + ((_f = target) === null || _f === void 0 ? void 0 : _f.token.value),
                        'Content-Type': 'application/json'
                    }
                };
                let query = `${(_g = target) === null || _g === void 0 ? void 0 : _g.api}/api/v1/teams/${(_h = target) === null || _h === void 0 ? void 0 : _h.team}/pipelines/${element.label}/jobs`;
                const response = yield axios_1.default.get(query, config);
                for (const data of response.data) {
                    let status;
                    if (data.next_build !== null) {
                        status = data.next_build.status;
                    }
                    else if (data.finished_build === null) {
                        status = 'null';
                    }
                    else {
                        status = data.finished_build.status;
                    }
                    targetSets.add(new PipelineObject(data.name, vscode.TreeItemCollapsibleState.Collapsed, element.target, 2, false, status));
                    //console.log(target);
                }
                console.log(response);
            }
            return Promise.resolve(Array.from(targetSets));
        });
    }
    getTreeItem(element) {
        return element;
    }
}
exports.ConsourseOutlineProvider = ConsourseOutlineProvider;
class PipelineObject extends vscode.TreeItem {
    constructor(label, collapsibleState, target, level, paused = false, status = 'null', command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.target = target;
        this.level = level;
        this.paused = paused;
        this.status = status;
        this.command = command;
        // iconPath = {
        // 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
        // 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
        // };
        this.contextValue = 'pipeline';
        let icon = 'dependency.svg';
        switch (level) {
            case 0:
                icon = 'dependency.svg';
                break;
            case 1:
                if (paused) {
                    icon = 'pause.svg';
                }
                else {
                    icon = 'play.svg';
                }
                break;
            case 2:
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
                    case 'null':
                        icon = 'indeterminate_check_box.svg';
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
//# sourceMappingURL=concourseOutline.js.map