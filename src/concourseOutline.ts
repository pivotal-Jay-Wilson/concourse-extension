import * as vscode from 'vscode';
//import * as json from 'jsonc-parser';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as fs  from 'fs';
import * as os  from 'os';
import axios from 'axios';


export class ConsourseOutlineProvider implements vscode.TreeDataProvider<PipelineObject> {

	private _onDidChangeTreeData: vscode.EventEmitter<PipelineObject | null> = new vscode.EventEmitter<PipelineObject | null>();
	readonly onDidChangeTreeData: vscode.Event<PipelineObject | null> = this._onDidChangeTreeData.event;
    targets: Map<string, Target>;

	constructor(private context: vscode.ExtensionContext) {
        try {
            const home = os.homedir();
            const doc = yaml.safeLoad(fs.readFileSync(home + '/.flyrc', 'utf8'));
            console.log(doc);
            this.targets = new Map(Object.entries(doc.targets));
          } catch (e) {
            this.targets = new Map();
            console.log(e);
          }
	}


	rename(offset: number): void {

	}

    async getChildren(element?: PipelineObject): Promise<PipelineObject[]> {
        let targetSets = new Set<PipelineObject>();
		if (!this.targets) {
			vscode.window.showInformationMessage('No .fryrc file. Log in with fly cli first');
			return Promise.resolve([]);
        }
        if (!element){
            for (const [name, value] of this.targets) {
                targetSets.add(new PipelineObject(name, vscode.TreeItemCollapsibleState.Collapsed, name, 0));
                //console.log(target);
            }
        } else if(element?.level ===  0) {
            const target = this.targets.get(element.label);
            let config = {
                headers: {
                  'Authorization': 'Bearer ' + target?.token.value,
                  'Content-Type': 'application/json'
                }
              };
              let query = `${target?.api}/api/v1/teams/${target?.team}/pipelines`;
              const response = await axios.get(query, config);
              for (const data of response.data) {
                targetSets.add(new PipelineObject(data.name, vscode.TreeItemCollapsibleState.Collapsed, element.target, 1, data.paused));
                //console.log(target);
            }
              console.log( response );
        } else if(element?.level ===  1) {
            const target = this.targets.get(element.target);
            let config = {
                headers: {
                  'Authorization': 'Bearer ' + target?.token.value,
                  'Content-Type': 'application/json'
                }
              };
              let query = `${target?.api}/api/v1/teams/${target?.team}/pipelines/${element.label}/jobs`;
              const response = await axios.get(query, config);
              for (const data of response.data) {
                let status:any;
                if (data.next_build !== null) {
                    status = data.next_build.status;
                } else if (data.finished_build === null) {
                    status = 'null';
                } else  {
                    status = data.finished_build.status;
                }
                targetSets.add(new PipelineObject(data.name, vscode.TreeItemCollapsibleState.Collapsed, element.target, 2, false, status));
                //console.log(target);
            }
              console.log( response );
        }
        return Promise.resolve(Array.from(targetSets));
	}


	getTreeItem(element: PipelineObject): PipelineObject {
       return element;
    }

}

export class PipelineObject extends vscode.TreeItem {

	constructor(
		public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public target:string,
        public level:number,
        public paused = false,
        public status = 'null',
		public readonly command?: vscode.Command
	) {
        super(label, collapsibleState);
        let icon = 'dependency.svg';
        switch (level) {
            case 0:
                icon = 'dependency.svg';
                break;
            case 1:
                if (paused){
                    icon = 'pause.svg';
                } else {
                    icon = 'play.svg';
                }                        
                break;
            case 2:
                switch (status ) {
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

	get tooltip(): string {
		return `${this.label}`;
	}

    iconPath:any;

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'pipeline';

}
interface Target {
    api: string;
    team: string;
    token: any;
}