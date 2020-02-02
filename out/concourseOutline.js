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
const yaml = require("js-yaml");
const fs = require("fs");
const os = require("os");
const axios_1 = require("axios");
const PipelineObject_1 = require("./PipelineObject");
const EventSource = require("eventsource");
const moment = require("moment");
class ConsourseOutlineView {
    constructor(context) {
        this.context = context;
        const cop = new ConsourseOutlineProvider(context);
        const option = { canSelectMany: false, showCollapseAll: true, treeDataProvider: cop };
        this.consourseViewer = vscode.window.createTreeView('consourseOutline', option);
        vscode.commands.registerCommand('consourseOutline.refreshEntry', () => cop.refreshEntry());
        vscode.commands.registerCommand('consourseOutline.pause', e => cop.pause(e));
        vscode.commands.registerCommand('consourseOutline.excute', e => cop.execute(e));
        cop.autoRefresh = true;
        cop.refresh();
    }
}
exports.ConsourseOutlineView = ConsourseOutlineView;
class ConsourseOutlineProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.targets = new Map();
        this.autoRefresh = false;
        this.output = vscode.window.createOutputChannel("Concourse");
        this.getTargets();
    }
    refresh() {
        setInterval(() => {
            this.refreshEntry();
        }, 10000);
    }
    getTargets() {
        try {
            const home = os.homedir();
            const doc = yaml.safeLoad(fs.readFileSync(home + '/.flyrc', 'utf8'));
            this.targets = new Map(Object.entries(doc.targets));
        }
        catch (e) {
            this.targets = new Map();
        }
    }
    refreshEntry() {
        this.getTargets();
        this._onDidChangeTreeData.fire();
    }
    getChildren(element) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let targetSets = new Set();
            let res;
            if (!this.targets) {
                vscode.window.showInformationMessage('No .flyrc file. Log in with fly cli first');
                return Promise.resolve([]);
            }
            switch ((_a = element) === null || _a === void 0 ? void 0 : _a.contextValue) {
                case undefined:
                    for (const [name, value] of this.targets) {
                        targetSets.add(new PipelineObject_1.PipelineObject(name, vscode.TreeItemCollapsibleState.Collapsed, name, false, 'null', 'target'));
                    }
                    break;
                case 'target':
                    res = yield this.getData(element);
                    for (const data of res) {
                        targetSets.add(new PipelineObject_1.PipelineObject(data.name, vscode.TreeItemCollapsibleState.Collapsed, element.target, data.paused, 'null', 'pipeline', `/${data.name}/jobs`));
                    }
                    break;
                case 'pipeline':
                    res = yield this.getData(element);
                    for (const data of res) {
                        let status;
                        if (data.paused) {
                            status = 'paused';
                        }
                        else if (data.next_build !== null) {
                            status = data.next_build.status;
                        }
                        else if (data.finished_build === null) {
                            status = 'null';
                        }
                        else {
                            status = data.finished_build.status;
                        }
                        targetSets.add(new PipelineObject_1.PipelineObject(data.name, vscode.TreeItemCollapsibleState.Collapsed, element.target, data.paused, status, 'job', `${element.url}/${data.name}/builds`));
                    }
                    break;
                case 'job':
                    res = yield this.getData(element);
                    for (const data of res) {
                        targetSets.add(new PipelineObject_1.PipelineObject(data.name, vscode.TreeItemCollapsibleState.None, element.target, false, data.status, 'build', data.api_url));
                    }
                    break;
                default:
                    break;
            }
            return Promise.resolve(Array.from(targetSets));
        });
    }
    getTreeItem(element) {
        return element;
    }
    pause(element) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const target = this.targets.get(element.target);
            let data = [];
            const url = element.paused ? 'unpause' : 'pause';
            try {
                let config = {
                    headers: {
                        'Authorization': 'Bearer ' + ((_a = target) === null || _a === void 0 ? void 0 : _a.token.value),
                        'Content-Type': 'application/json'
                    }
                };
                const elementurl = element.url.substring(0, element.url.lastIndexOf('/'));
                // Request URL: http://127.0.0.1:8080/api/v1/teams/main/pipelines/hello-world/jobs/job-hello-world/pause
                let query = `${(_b = target) === null || _b === void 0 ? void 0 : _b.api}/api/v1/teams/${(_c = target) === null || _c === void 0 ? void 0 : _c.team}/pipelines${elementurl}/${url}`;
                console.log(query);
                const response = yield axios_1.default.put(query, '', config);
                console.log(response);
                this.refreshEntry();
            }
            catch (error) {
                console.log(error);
                vscode.window.showInformationMessage(`Could not connect to ${(_d = target) === null || _d === void 0 ? void 0 : _d.team} @ ${(_e = target) === null || _e === void 0 ? void 0 : _e.api}`);
            }
        });
    }
    execute(element) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const target = this.targets.get(element.target);
            if (!this.targets) {
                vscode.window.showInformationMessage('No .flyrc file. Log in with fly cli first');
                return;
            }
            try {
                let config = {
                    headers: {
                        'Authorization': 'Bearer ' + ((_a = target) === null || _a === void 0 ? void 0 : _a.token.value),
                        'Content-Type': 'application/json'
                    }
                };
                let query = `${(_b = target) === null || _b === void 0 ? void 0 : _b.api}/api/v1/teams/${(_c = target) === null || _c === void 0 ? void 0 : _c.team}/pipelines${element.url}`;
                const response = yield axios_1.default.post(query, '', config);
                this.getEvents(element, response.data.api_url);
                this.refreshEntry();
            }
            catch (error) {
                console.log(error);
                vscode.window.showInformationMessage(`Could not connect to ${(_d = target) === null || _d === void 0 ? void 0 : _d.team} @ ${(_e = target) === null || _e === void 0 ? void 0 : _e.api}`);
            }
        });
    }
    getData(element) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const target = this.targets.get(element.target);
            let data = [];
            try {
                let config = {
                    headers: {
                        'Authorization': 'Bearer ' + ((_a = target) === null || _a === void 0 ? void 0 : _a.token.value),
                        'Content-Type': 'application/json'
                    }
                };
                let query = `${(_b = target) === null || _b === void 0 ? void 0 : _b.api}/api/v1/teams/${(_c = target) === null || _c === void 0 ? void 0 : _c.team}/pipelines${element.url}`;
                const response = yield axios_1.default.get(query, config);
                data = response.data;
            }
            catch (error) {
                vscode.window.showInformationMessage(`Could not connect to ${(_d = target) === null || _d === void 0 ? void 0 : _d.team} @ ${(_e = target) === null || _e === void 0 ? void 0 : _e.api}`);
            }
            return data;
        });
    }
    getEvents(element, api_url) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const target = this.targets.get(element.target);
            let data = [];
            try {
                let query = `${(_a = target) === null || _a === void 0 ? void 0 : _a.api}${api_url}/events`;
                let config = {
                    headers: {
                        'Authorization': 'Bearer ' + ((_b = target) === null || _b === void 0 ? void 0 : _b.token.value)
                    }
                };
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `${element.label} for ${api_url}`,
                    cancellable: true
                }, (progress, token) => {
                    token.onCancellationRequested(() => {
                        console.log("User canceled the long running operation");
                    });
                    var p = new Promise((resolve, reject) => {
                        const es = new EventSource(query, config);
                        let increment = 0;
                        es.onerror = (e) => {
                            console.log("error");
                            console.log(e);
                            reject();
                        };
                        es.addEventListener('end', (e) => {
                            console.log("end");
                            resolve();
                        });
                        es.addEventListener('event', (e) => {
                            var _a, _b, _c, _d, _e, _f, _g, _h;
                            const event = JSON.parse(e.data);
                            let message = '';
                            increment += 5;
                            let time = moment.unix(event.data.time).format("dddd, MMMM Do YYYY, h:mm:ss a");
                            switch (event.event) {
                                case 'status':
                                    if (event.data.status && event.data.status === 'started') {
                                        message = `[${time}] Started Build`;
                                    }
                                    if (event.data.status && event.data.status === 'succeeded') {
                                        this.output.appendLine(`[${time}] Build Succeeded`);
                                        resolve();
                                    }
                                    break;
                                case 'start-task':
                                    message = `[${time}] Starting Task`;
                                    break;
                                case 'initialize-task':
                                    let args = ((_c = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.config) === null || _b === void 0 ? void 0 : _b.run) === null || _c === void 0 ? void 0 : _c.args) ? (_f = (_e = (_d = event.data) === null || _d === void 0 ? void 0 : _d.config) === null || _e === void 0 ? void 0 : _e.run) === null || _f === void 0 ? void 0 : _f.args : "";
                                    message = `[${time}] ${(_h = (_g = event.data) === null || _g === void 0 ? void 0 : _g.config.run) === null || _h === void 0 ? void 0 : _h.path} ${args}`;
                                    break;
                                case 'log':
                                    message = `[${time}] ${event.data.payload}`;
                                    break;
                                case 'finish-task':
                                    message = `[${time}] Finished Task`;
                                    break;
                                default:
                                    console.log(e);
                                    break;
                            }
                            progress.report({ increment: increment, message: message });
                            this.output.show();
                            this.output.appendLine(message);
                        });
                    });
                    return p;
                });
            }
            catch (error) {
                vscode.window.showInformationMessage(`Could not connect to ${(_c = target) === null || _c === void 0 ? void 0 : _c.team} @ ${(_d = target) === null || _d === void 0 ? void 0 : _d.api}`);
            }
            return data;
        });
    }
}
exports.ConsourseOutlineProvider = ConsourseOutlineProvider;
//# sourceMappingURL=concourseOutline.js.map