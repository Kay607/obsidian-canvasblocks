import { DataAdapter, Plugin, TFile, View, ItemView, App, TAbstractFile, WorkspaceLeaf } from "obsidian";
import { CanvasNodeData, CanvasData, CanvasTextData, CanvasFileData } from "obsidian/canvas";

import { CanvasBlocksPluginSettingTab } from "./settings";

import { PythonShell } from 'python-shell';

// @ts-ignore
import canvasblocks_python_lib from '../resources/canvasblocks-python-lib.py';


interface ExtendedDataAdapter extends DataAdapter {
    basePath?: string;
}

interface CanvasView extends ItemView {
    canvas?: any;
}

interface CanvasLeaf extends WorkspaceLeaf {
	rebuildView(): any;
}

interface NodeTemplate {
	pos: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    save: boolean;
    focus: boolean;
}

interface TextNodeTemplate extends NodeTemplate {
    text: string;
}

interface FileNodeTemplate extends NodeTemplate {
    file: TAbstractFile | null;
}

export interface ExtendedCanvas {
	nodes: { [id: string]: any };
	edges: { [id: string]: any };
	data: CanvasData;
	view: CanvasView;

	createTextNode(node: TextNodeTemplate): void;
	createFileNode(node: FileNodeTemplate): void;
}


interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

function collisionDistanceSquared(bbox1: BoundingBox, bbox2: BoundingBox): number
{
    // Extracting values from each bounding box
    const { minX: x1_min, minY: y1_min, maxX: x1_max, maxY: y1_max } = bbox1;
    const { minX: x2_min, minY: y2_min, maxX: x2_max, maxY: y2_max } = bbox2;

    // Calculating center coordinates of each bounding box
    const bbox1_center_x = (x1_min + x1_max) / 2;
    const bbox1_center_y = (y1_min + y1_max) / 2;
    const bbox2_center_x = (x2_min + x2_max) / 2;
    const bbox2_center_y = (y2_min + y2_max) / 2;

    // Calculating distance between the centers of the bounding boxes
    const distanceSquared = (bbox1_center_x - bbox2_center_x) ** 2 + (bbox1_center_y - bbox2_center_y) ** 2;

    // Checking for collision
    if ((x1_min <= x2_max && x1_max >= x2_min) && (y1_min <= y2_max && y1_max >= y2_min)) {
        return distanceSquared;
    } else {
        return -1;
    }
}


async function getNodeText(app: App, node: CanvasNodeData): Promise<string | null>
{
	let text: string;

	if (node.type == "text")
	{
		text = (node as CanvasTextData).text;
	}
	else if(node.type == "file" && (node as CanvasFileData).file.endsWith("md"))
	{
		let filePath = (node as CanvasFileData).file;
		let file: TAbstractFile|null = app.vault.getAbstractFileByPath(filePath);

		if(file === null) return null
		if(!(file instanceof TFile)) return null;

		text = await app.vault.read(file);
	}
	else { return null; }

	return text;
}

async function extractScriptText(app: App, node: CanvasNodeData): Promise<string | null>
{
	let text: string|null = await getNodeText(app, node);
	if(text === null) return null;

    let regex = new RegExp("```" + pythonCodeBlockLanguageName + "\\s*([\\s\\S]*?)```");
    let match = regex.exec(text);

    // Return the text inside the first match or null if no match is found
    return match ? match[1] : null;
}

async function checkIsScript(app: App, node: CanvasNodeData): Promise<boolean>
{
	let text: string|null = await getNodeText(app, node);
	if(text === null) return false;
	
	if (text.contains("```" + pythonCodeBlockLanguageName)) return true;
	return false;
}


interface CanvasBlocksPluginSettings
{
	dataFolder: string;
}

const DEFAULT_SETTINGS: CanvasBlocksPluginSettings = {
	dataFolder: "Assets/CanvasBlocks",
};

const pythonCodeBlockLanguageName = "pycanvasblock";

export default class CanvasBlocksPlugin extends Plugin {
	settings: CanvasBlocksPluginSettings;

	async onload() {
		//registerEvents(this);
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new CanvasBlocksPluginSettingTab(this.app, this));

		this.addCommand({
			id: "execute-canvas-script",
			name: "Execute Canvas Script",
			callback: () => {
				this.handleRun();
			},
		});

		// Hide code blocks
		this.registerMarkdownCodeBlockProcessor(pythonCodeBlockLanguageName, () =>
		{
			return;
		})
	}

	onunload() {}

	async loadSettings() 
	{
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	
	async saveSettings() 
	{
		await this.saveData(this.settings);
	}

	// Returns folder name with leading and trailing '/'
	getDataFolder(leading: boolean = true)
	{
		let folder = this.settings.dataFolder;
		if (this.settings.dataFolder.length === 0) return "/";
		if (this.settings.dataFolder === "/") return this.settings.dataFolder;

		if (leading)
			if(folder[0] !== "/") folder = "/" + folder;

		if(folder[folder.length - 1] !== "/") folder = folder + "/";
		return folder;
	}

	handleRun()
	{
		let view : CanvasView|null = this.app.workspace.getActiveViewOfType(ItemView);
		if(view === null) return;
		if(!view.hasOwnProperty('canvas')) return;

		let canvas = view.canvas;
		
		let selected = canvas.selection;
		if (selected.size === 0) return;

		// Gets the DOM object and ID
		let selectedNode = selected.values().next().value;
		let selectionID = selectedNode.id;

		let closest : string|null = null;
		let nodes : any[] = canvas.data.nodes;
		let closestDistance = 1e10;

		nodes.forEach(node => {
			if(node.id == selectionID) return;
			let distance = collisionDistanceSquared(selectedNode.bbox, { minX: node.x, minY: node.y, maxX: node.x+node.width, maxY: node.y+node.height })

			if(distance === -1) return;

			if(distance < closestDistance)
			{
				closest = node.id;
				closestDistance = distance;
			}
		});

		this.handleCommand(canvas, selectionID, closest);
	}

	getNodeByID(canvas: ExtendedCanvas, id: string)
	{
		return canvas.data.nodes.filter(node => node.id === id)[0];
	}

	async handleCommand(canvas: ExtendedCanvas, selectedID: string, otherID: string|null)
	{
		// If selected and other are both scripts, use selected as the script
		// If neither are scripts, return
		// Otherwise, use the valid script as a script
		let selectedData = this.getNodeByID(canvas, selectedID);
		let selectedIsValidScript = await checkIsScript(this.app, selectedData);

		if (!selectedIsValidScript && otherID === null) return;

		let scriptID: string;
		let parameterID: string|null;

		if (selectedIsValidScript)
		{
			scriptID = selectedID;
			parameterID = otherID;
		}
		else
		{
			let otherData = this.getNodeByID(canvas, otherID!);
			let otherIsValidScript = await checkIsScript(this.app, otherData);
			if (!otherIsValidScript) return;
			
			scriptID = otherID!;
			parameterID = selectedID;
		}


		let paramterData = {};
		if (parameterID !== null)
			paramterData = this.getNodeByID(canvas, parameterID);
		let scriptData = this.getNodeByID(canvas, scriptID);


		// Finds all edges that point into the script node
		let arrowParamterEdges = canvas.data!.edges.filter(edge => edge.toNode === scriptID);

		// Gets the IDs of nodes pointing to the script node
		let arrowParameterIDs = arrowParamterEdges.map(edge => edge.fromNode);

		// Finds the nodes from the IDs
		let arrowParamters = canvas.data.nodes.filter((node) => arrowParameterIDs.includes(node.id));

		// Gets the string within the ```pycanvasblock ``` to run as code
		let scriptCode = await extractScriptText(this.app, scriptData);
		if (scriptCode === null) return;

		
		let adapter : ExtendedDataAdapter = this.app.vault.adapter;
		// Construct the Python script
		const pythonScript = `
${canvasblocks_python_lib}

# Set variables
parameter_data = json.loads(\"\"\"${JSON.stringify(paramterData).replace(/\\/g, '\\\\')}\"\"\")
script_data = json.loads(\"\"\"${JSON.stringify(scriptData).replace(/\\/g, '\\\\')}\"\"\")
arrow_parameters = json.loads(\"\"\"${JSON.stringify(arrowParamters).replace(/\\/g, '\\\\')}\"\"\")
vault_path = ${JSON.stringify(adapter.basePath).replace(/\\/g, '\\\\')}
plugin_folder = ${JSON.stringify(this.getDataFolder(false)).replace(/\\/g, '\\\\')}
has_parameter = ${parameterID !== null ? "True" : "False"}

${scriptCode.replace(/[^\x20-\x7E\t\n]/g, '')}
		`;
	
		// Execute the Python script
		PythonShell.runString(pythonScript, {mode: 'json'}).then((messages) => {
			//console.log(messages);
	
			messages.forEach(message => {
				let commandType = message.command;

				switch (commandType) {
					case "CREATE_TEXT_NODE":
						{
							canvas.createTextNode({
								text: message.text,
								pos: {
									x: message.x,
									y: message.y,
								},
								size: {
									width: message.width,
									height: message.height
								},
								save: false,
								focus: false,
							});
						}
						break;

					case "CREATE_FILE_NODE":
						{
							let nodeFile = this.app.vault.getAbstractFileByPath(message.file);
							canvas.createFileNode({
								file: nodeFile,
								pos: {
									x: message.x,
									y: message.y,
								},
								size: {
									width: message.width,
									height: message.height
								},
								save: false,
								focus: false,
							});
						}
						break;

					case "MODIFY_TEXT_NODE":
						{
							canvas.nodes.get(message.id).setText(message.text);
							canvas.data.nodes.filter(node => node.id === message.id)[0].text = message.text;
						}
						break;

					case "REBUILD_CANVAS":
						{
							(canvas.view.leaf as CanvasLeaf).rebuildView();
						}
						break;

					case "PRINT":
						{
							console.log(message.text);
						}
				
					default:
						break;
				}
			});

		}).catch ((error) => {
			console.error('Error parsing Python script result:', error);
		});

	}

}
