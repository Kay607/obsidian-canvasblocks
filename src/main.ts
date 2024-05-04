import { DataAdapter, Plugin, TFile, View } from "obsidian";

import { PythonShell } from 'python-shell';

import { CanvasBlocksPluginSettingTab } from "./settings";


interface ExtendedDataAdapter extends DataAdapter {
    basePath?: string;
}

interface ExtendedView extends View {
    canvas?: any;
}

interface CanvasNode {
    id: string;
    type: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
}


interface ExtendedCanvas {
	nodes: { [id: string]: any };
	edges: { [id: string]: any };
	data: CanvasData;
}

interface CanvasData {
	nodes: CanvasNode[];
	edges: any[];
}




interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

function CollisionDistanceSquared(bbox1: BoundingBox, bbox2: BoundingBox): number {
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

function extractTextBetweenDoublePercent(text: string): string | null {
    const regex = /%%([\s\S]*?)%%/m;
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}


function CheckIsCommand(object: any) {
	if (!object.hasOwnProperty('text')) return false;
	let text = object.text;
	if (text.contains("%%")) return true;
	return false;
}


interface CanvasBlocksPluginSettings
{
	dataFolder: string;
}

const DEFAULT_SETTINGS: CanvasBlocksPluginSettings = {
	dataFolder: "Assets/CanvasBlocks",
};


export default class CanvasBlocksPlugin extends Plugin {
	settings: CanvasBlocksPluginSettings;

	async onload() {
		//registerEvents(this);
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new CanvasBlocksPluginSettingTab(this.app, this));

		this.addCommand({
			id: "execute-console-command",
			name: "Execute Canvas Command",
			callback: () => {
				this.HandleRun();
			},
		});
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
	GetDataFolder(leading: boolean = true)
	{
		let folder = this.settings.dataFolder;
		if (this.settings.dataFolder.length === 0) return "/";
		if (this.settings.dataFolder === "/") return this.settings.dataFolder;

		if (leading)
			if(folder[0] !== "/") folder = "/" + folder;

		if(folder[folder.length - 1] !== "/") folder = folder + "/";
		return folder;
	}

	HandleRun()
	{
		if (this.app.workspace.activeLeaf === null) return;

		let canvasLeaf = this.app.workspace.activeLeaf;
		if(!canvasLeaf.view.hasOwnProperty('canvas')) return;
		let view : ExtendedView = canvasLeaf.view;
		let canvas = view.canvas;
		
		let selected = canvas.selection;
		if (selected.size === 0) return;

		let selectedNode = selected.values().next().value;
		let selectionID = selectedNode.id;

		let closest : string|null = null;
		let nodes : any[] = canvas.data.nodes;
		let closestDistance = 1e10;

		nodes.forEach(node => {
			if(node.id == selectionID) return;
			let distance = CollisionDistanceSquared(selectedNode.bbox, { minX: node.x, minY: node.y, maxX: node.x+node.width, maxY: node.y+node.height })

			if(distance === -1) return;

			if(distance < closestDistance)
			{
				closest = node.id;
				closestDistance = distance;
			}
		});

		this.HandleCommand(canvas, canvasLeaf, selectionID, closest);
	}

	async HandleCommand(canvas: ExtendedCanvas, canvasLeaf: object, commandID: string, dataID: string|null)
	{
		let commandObj = canvas.nodes.get(commandID);
		let commandIsValidCommand = CheckIsCommand(commandObj);

		let dataObj = "";
		if (dataID !== null)
		{
			dataObj = canvas.nodes.get(dataID);

			let dataIsValidCommand = CheckIsCommand(dataObj);

			if (!commandIsValidCommand && !dataIsValidCommand) return;

			if (!commandIsValidCommand)
			{
				// Swap the node data
				[commandObj, dataObj] = [dataObj, commandObj];
				[commandID, dataID] = [dataID, commandID];
			}
		}

		let arrowParamterEdges = canvas.data!.edges.filter(edge => edge.toNode === commandID);
		let arrowParameterIDs = arrowParamterEdges.map(edge => edge.fromNode);
		let arrowParamters = canvas.data.nodes.filter((node) => arrowParameterIDs.includes(node.id));


		let code = extractTextBetweenDoublePercent(commandObj.text);
		if (code === null) return;

		console.log(code);

		console.log({dataID, commandID, dataObj, commandObj});


		let file = this.app.vault.getAbstractFileByPath(`${this.GetDataFolder(false)}Functions.md`);

		if (file === null || !(file instanceof TFile)) return;
		let functions = await this.app.vault.read(file);
		console.log(functions);

		let paramterData = {};
		if (dataID !== null)
			paramterData = canvas.data.nodes.filter(node => node.id === dataID)[0];
		let commandData = canvas.data.nodes.filter(node => node.id === commandID)[0];

		let adapter : ExtendedDataAdapter = this.app.vault.adapter;
		// Construct the Python script
		const pythonScript = `
${functions}

# Set variables
parameterData = json.loads(\"\"\"${JSON.stringify(paramterData).replace(/\\/g, '\\\\')}\"\"\")
commandData = json.loads(\"\"\"${JSON.stringify(commandData).replace(/\\/g, '\\\\')}\"\"\")
arrowParameters = json.loads(\"\"\"${JSON.stringify(arrowParamters).replace(/\\/g, '\\\\')}\"\"\")
vaultPath = """${adapter.basePath}"""
pluginFolder = """${this.GetDataFolder(false)}"""
hasParameter = ${dataID !== null ? "True" : "False"}

${code}
		`;

		console.log(pythonScript);
	
		// Execute the Python script
		PythonShell.runString(pythonScript, {mode: 'json'}).then((messages) => {
			console.log(messages);
	
				messages.forEach(message => {
					let commandType = message.command;

					switch (commandType) {
						case "CREATE_TEXT_NODE":
							{
								(canvas as any).createTextNode({
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
								(canvas as any).createFileNode({
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
								(canvasLeaf as any).rebuildView();
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
