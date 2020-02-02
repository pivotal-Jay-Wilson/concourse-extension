import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs  from 'fs';
import * as os  from 'os';
import axios from 'axios';
import { PipelineObject } from './PipelineObject';
import * as EventSource from 'eventsource';
import * as moment from 'moment';

export class ConsourseOutlineView {
    private consourseViewer: vscode.TreeView<PipelineObject>;

    constructor(private context: vscode.ExtensionContext) {
        
        const cop = new ConsourseOutlineProvider(context);
        const option: vscode.TreeViewOptions<PipelineObject> = {canSelectMany: false, showCollapseAll: true, treeDataProvider: cop };
        this.consourseViewer = vscode.window.createTreeView('consourseOutline', option);
        vscode.commands.registerCommand('consourseOutline.refreshEntry', () => cop.refreshEntry());
        vscode.commands.registerCommand('consourseOutline.pause', e => cop.pause(e));
        vscode.commands.registerCommand('consourseOutline.excute', e => cop.execute(e));
        cop.autoRefresh = true;
        cop.refresh();


    }
}

export class ConsourseOutlineProvider implements vscode.TreeDataProvider<PipelineObject> {

	private _onDidChangeTreeData: vscode.EventEmitter<PipelineObject | null> = new vscode.EventEmitter<PipelineObject | null>();
	readonly onDidChangeTreeData: vscode.Event<PipelineObject | null> = this._onDidChangeTreeData.event;
    targets: Map<string, Target> = new Map();
    autoRefresh: boolean = false;
    private output: vscode.OutputChannel;

     refresh() {
        setInterval(()=>{
            this.refreshEntry();
        }, 10000);
    }

	constructor(private context: vscode.ExtensionContext) {
        this.output = vscode.window.createOutputChannel("Concourse");
        this.getTargets();
	}

    

    private getTargets() {
        try {
            const home = os.homedir();
            const doc = yaml.safeLoad(fs.readFileSync(home + '/.flyrc', 'utf8'));
            this.targets = new Map(Object.entries(doc.targets));
          } catch (e) {
            this.targets = new Map();
          }
    }
    refreshEntry(){
        this.getTargets();
        this._onDidChangeTreeData.fire();
    }

    async getChildren(element?: PipelineObject): Promise<PipelineObject[]> {
        let targetSets = new Set<PipelineObject>();
        let res:any;
		if (!this.targets) {
			vscode.window.showInformationMessage('No .flyrc file. Log in with fly cli first');
			return Promise.resolve([]);
        }
        switch (element?.contextValue) {
            case undefined:
                for (const [name, value] of this.targets) {
                    targetSets.add(new PipelineObject(name, vscode.TreeItemCollapsibleState.Collapsed, name, false, 'null','target'));
                }                    
                break;
            case 'target':
                res = await this.getData(element);
                for (const data of res) {
                  targetSets.add(new PipelineObject(data.name, vscode.TreeItemCollapsibleState.Collapsed, element.target, data.paused, 'null' ,'pipeline',  `/${data.name}/jobs`));
               }
               break;
            case 'pipeline':
                res = await this.getData(element);
                for (const data of res) {
                    let status:any;
                    if (data.paused){
                        status = 'paused';
                    } else if (data.next_build !== null) {
                        status = data.next_build.status;
                    } else if (data.finished_build === null) {
                        status = 'null';
                    } else  {
                        status = data.finished_build.status;
                    }
                    targetSets.add(new PipelineObject(data.name, vscode.TreeItemCollapsibleState.Collapsed, element.target, data.paused, status, 'job', `${element.url}/${data.name}/builds`));
                }
                break;
            case 'job':    
                res = await this.getData(element);
                for (const data of res) {
                    targetSets.add(new PipelineObject(data.name, vscode.TreeItemCollapsibleState.None, element.target, false, data.status, 'build', data.api_url));
                }
                break;
            default:
                break;  
        }
        return Promise.resolve(Array.from(targetSets));
	}


	getTreeItem(element: PipelineObject): PipelineObject {
       return element;
    }

    async pause(element: PipelineObject) { 
        const target = this.targets.get(element.target);
        let data:any  = [];
        const url = element.paused?'unpause':'pause';
        try {
            let config = {
                headers: {
                  'Authorization': 'Bearer ' + target?.token.value,
                  'Content-Type': 'application/json'
                }
              };
              const elementurl = element.url.substring(0,element.url.lastIndexOf('/'));
              // Request URL: http://127.0.0.1:8080/api/v1/teams/main/pipelines/hello-world/jobs/job-hello-world/pause
              let query = `${target?.api}/api/v1/teams/${target?.team}/pipelines${elementurl}/${url}`;
              console.log(query);
              const response = await axios.put(query, '',config);
              console.log(response);  
              this.refreshEntry();         
        } catch (error) {
            console.log(error);  
            vscode.window.showInformationMessage(`Could not connect to ${target?.team} @ ${target?.api}`);
        }           
    }

    async execute(element: PipelineObject) { 
        const target = this.targets.get(element.target);
		if (!this.targets) {
			vscode.window.showInformationMessage('No .flyrc file. Log in with fly cli first');
			return;
        }        
        try {
            let config = {
                headers: {
                  'Authorization': 'Bearer ' + target?.token.value,
                  'Content-Type': 'application/json'
                }
              };
              let query = `${target?.api}/api/v1/teams/${target?.team}/pipelines${element.url}`;
              const response = await axios.post(query, '',config);
              this.getEvents(element,  response.data.api_url);
              this.refreshEntry();         
        } catch (error) {
            console.log(error);  
            vscode.window.showInformationMessage(`Could not connect to ${target?.team} @ ${target?.api}`);
        }           
    }   

    private async getData(element: PipelineObject){
        const target = this.targets.get(element.target);
        let data:any  = [];
        try {
            let config = {
                headers: {
                  'Authorization': 'Bearer ' + target?.token.value,
                  'Content-Type': 'application/json'
                }
              };
              let query = `${target?.api}/api/v1/teams/${target?.team}/pipelines${element.url}`;
              const response = await axios.get(query, config);
              data =  response.data;            
        } catch (error) {
            vscode.window.showInformationMessage(`Could not connect to ${target?.team} @ ${target?.api}`);
        }
        return data;
    }

    private async getEvents(element: PipelineObject, api_url: string){
        const target = this.targets.get(element.target);
        let data:any  = [];
        try {
            let query = `${target?.api}${api_url}/events`;
            let config = {
                headers: {
                  'Authorization': 'Bearer ' + target?.token.value
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
                var p = new Promise((resolve, reject)=> {
                    const es = new EventSource(query, config);  
                    let increment = 0;
                    es.onerror = (e:any) => { 
                        console.log("error");
                        console.log(e);                        
                        reject();
                    };
                    es.addEventListener('end',  (e:any) => { 
                        console.log("end");
                        resolve();
                    });                    
                    es.addEventListener('event',  (e:any) => {
                        const event = JSON.parse(e.data);
                        let message = '';
                        increment += 5;
                        let time = moment.unix(event.data.time).format("dddd, MMMM Do YYYY, h:mm:ss a");
                        switch (event.event) {
                            case 'status':
                                if (event.data.status && event.data.status === 'started'){
                                    message = `[${time}] Started Build`;
                                }
                                if (event.data.status && event.data.status === 'succeeded'){
                                    this.output.appendLine(`[${time}] Build Succeeded`);
                                    resolve();
                                }    
                                break;
                            case 'start-task':
                                message = `[${time}] Starting Task`;
                                break;
                            case 'initialize-task':
                                let args = (event.data?.config?.run?.args)? event.data?.config?.run?.args : ""; 
                                message = `[${time}] ${event.data?.config.run?.path} ${args}`;
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
        } catch (error) {
            vscode.window.showInformationMessage(`Could not connect to ${target?.team} @ ${target?.api}`);
        }
        return data;
    }
}
 
interface Target {
    api: string;
    team: string;
    token: any;
}