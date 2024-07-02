import { DataAdapter, Plugin, TFile, ItemView, App, TAbstractFile, Notice, normalizePath, FuzzySuggestModal, Vault, TFolder, setTooltip, setIcon } from "obsidian";
import { AllCanvasNodeData } from "obsidian/canvas";

import { CanvasBlocksPluginSettingTab } from "./settings";
import { cachedGetWorkflowNodes, getWorkflowNodes, handleWorkflowFromGroup, refreshNode } from "./workflow";
import { executePythonString } from "./pythonexecution";
import { addWorkflowScript } from "./workflow";
import { CanvasView, ExtendedCanvas, ExtendedEdge, ExtendedNode } from "./canvasdefinitions";
import { workflowNodesDimensions } from "./constants";

export interface ExtendedDataAdapter extends DataAdapter {
    basePath?: string;
}

export function boundingBoxFromNode(node: AllCanvasNodeData): BoundingBox
{
	const bbox: BoundingBox = { minX: node.x, minY: node.y, maxX: node.x+node.width, maxY: node.y+node.height };
	return bbox
}

// eslint-disable-next-line no-unused-vars
export async function canvasClosestNodeToPosition(canvas: ExtendedCanvas, x: number, y: number, filterInvalidFunction: (node: AllCanvasNodeData) => boolean | Promise<boolean> = () => false) : Promise<string|null> {
    let closest: string|null = null;
    const nodes: AllCanvasNodeData[] = canvas.data.nodes;
    let closestDistanceSquared = 1e10;

    for (const node of nodes) {
        if (await filterInvalidFunction(node)) continue;

        const distanceSquared = (node.x - x) ** 2 + (node.y - y) ** 2;

        if(distanceSquared < closestDistanceSquared)
        {
            closest = node.id;
            closestDistanceSquared = distanceSquared;
        }
    }

    return closest;
}


// eslint-disable-next-line no-unused-vars
export async function canvasClosestNodeToPositionInBounds(canvas: ExtendedCanvas, boundingBox: BoundingBox, filterInvalidFunction: (node: AllCanvasNodeData) => boolean | Promise<boolean> = () => false) : Promise<string|null> {
    let closest: string|null = null;
    const nodes: AllCanvasNodeData[] = canvas.data.nodes;
    let closestDistanceSquared = 1e10;

    for (const node of nodes) {
        const { minX: x1_min, minY: y1_min, maxX: x1_max, maxY: y1_max } = boundingBox;
        const { minX: x2_min, minY: y2_min, maxX: x2_max, maxY: y2_max } = boundingBoxFromNode(node);

        const bbox1_center_x = (x1_min + x1_max) / 2;
        const bbox1_center_y = (y1_min + y1_max) / 2;
        const bbox2_center_x = (x2_min + x2_max) / 2;
        const bbox2_center_y = (y2_min + y2_max) / 2;

        const distanceSquared = (bbox1_center_x - bbox2_center_x) ** 2 + (bbox1_center_y - bbox2_center_y) ** 2;

        if ((x1_min <= x2_max && x1_max >= x2_min) && (y1_min <= y2_max && y1_max >= y2_min)) {
            if (await filterInvalidFunction(node)) continue;
            if (distanceSquared < closestDistanceSquared) {
                closest = node.id;
                closestDistanceSquared = distanceSquared;
            }
        }
    }

    return closest;
}

// eslint-disable-next-line no-unused-vars
export async function canvasNodesInBounds(canvas: ExtendedCanvas, boundingBox: BoundingBox, filterInvalidFunction: (node: AllCanvasNodeData) => boolean | Promise<boolean> = () => false): Promise<string[]> {
    const nodesInBounds: string[] = [];
    const nodes: AllCanvasNodeData[] = canvas.data.nodes;

    for (const node of nodes) {
        const { minX: x1_min, minY: y1_min, maxX: x1_max, maxY: y1_max } = boundingBox;
        const { minX: x2_min, minY: y2_min, maxX: x2_max, maxY: y2_max } = boundingBoxFromNode(node);

        if ((x1_min <= x2_max && x1_max >= x2_min) && (y1_min <= y2_max && y1_max >= y2_min)) {
            if (await filterInvalidFunction(node)) continue;
            nodesInBounds.push(node.id);
        }
    }

    return nodesInBounds;
}



export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface Box extends Position {
	width: number;
	height: number;
}

export interface Position {
	x: number;
	y: number;
}


export interface ConnectionPointData
{
	name: string;
	scriptID: string;
}

export interface IOConnection {
    direction: "input" | "output";
    type: string;
}

export interface CanvasBlockSetting
{
	ioConnections: { [key: string]: IOConnection };
}


export async function getNodeText(app: App, node: AllCanvasNodeData): Promise<string | null>
{
	let text: string;

	if(node.hasOwnProperty("filePath"))
	{
		node.file = node.filePath;
		node.type = "file";
	}

	if (node.type === "text")
		text = node.text;

	else if (node.type === "link") 
		text = node.url;

	else if (node.type === "group")
	{
		if (node.label !== undefined)
			text = node.label;
		else return null;
	}

	else if(node.type === "file" && node.file.endsWith("md"))
	{
		const filePath: string = node.file;
		const file: TAbstractFile|null = app.vault.getAbstractFileByPath(filePath);

		if(file === null) return null
		if(!(file instanceof TFile)) return null;

		text = await app.vault.read(file);
	}
	else { return node.file; }

	return text;
}

export async function extractLanguageText(app: App, source: AllCanvasNodeData|string, language: string): Promise<string | null>
{
	let text: string;
	if(typeof source === 'string')
		text = source
	else{
		const returnedText = await getNodeText(app, source);
		if(returnedText === null) return null;
		text = returnedText;
	}

	const languageRegex = new RegExp("```\\s*" + language + "\\s*([\\s\\S]*?)```");
    const match = languageRegex.exec(text);

    // Return the text inside the first match or null if no match is found
    return match ? match[1] : null;
}

export async function checkContainsLanguage(app: App, node: AllCanvasNodeData, language: string): Promise<boolean>
{
	const text: string|null = await getNodeText(app, node);
	if(text === null) return false;
	
	const languageRegex = new RegExp("```\\s*" + language + "\\s*([\\s\\S]*?)```");
	return languageRegex.test(text);
}


class FuzzyScriptSuggester extends FuzzySuggestModal<TFile>
{
	private plugin: CanvasBlocksPlugin;

	constructor(plugin: CanvasBlocksPlugin)
	{
		super(app);
		this.plugin = plugin;
		this.setPlaceholder("Enter the name of a script");
	}

	getItems(): TFile[] {
		const files: TFile[] = [];

		const folder = app.vault.getAbstractFileByPath(normalizePath(this.plugin.settings.workflowScriptFolder));
		if(folder === null) return [];
		if (!(folder instanceof TFolder)) return [];

		Vault.recurseChildren(folder, (file: TAbstractFile) => {
			if (file instanceof TFile) {
				files.push(file);
			}
		});
		return files;
	}
	getItemText(item: TFile): string {
		return item.basename;
	}
	onChooseItem(item: TFile): void {
		addWorkflowScript(this.plugin, item);
	}
	
}


interface CanvasBlocksPluginSettings
{
	dataFolder: string;
	workflowScriptFolder: string;
	pythonPath: string;
}

const DEFAULT_SETTINGS: CanvasBlocksPluginSettings = {
	dataFolder: "",
	workflowScriptFolder: "",
	pythonPath: ""
};

export const pythonCodeBlockLanguageName = "pycanvasblock";
export const canvasBlockSettingsLanguageName = "canvasblocksettings";
export const canvasBlockConnectionPointLanguageName = "canvasblockconnectionpoint";

export default class CanvasBlocksPlugin extends Plugin {
	settings: CanvasBlocksPluginSettings;
	plugin: CanvasBlocksPlugin = this;

	async onload() {
		//registerEvents(this);
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new CanvasBlocksPluginSettingTab(this.app, this));


		this.addCommand({
			id: "execute-canvas-script",
			name: "Execute canvas script",
			callback: () => {
				this.handleRun();
			},
		});

		this.addCommand({
			id: "add-workflow-script",
			name: "Add workflow script",
			callback: () => {
				new FuzzyScriptSuggester(this).open();
			},
		})


		this.registerEvent(this.app.workspace.on('layout-change', () =>
		{
			// eslint-disable-next-line @typescript-eslint/no-this-alias
			const that = this;

			const view : CanvasView|null = this.app.workspace.getActiveViewOfType(ItemView) as CanvasView;
			if(view === null) return;
			if(!view.hasOwnProperty('canvas')) {
				return;
			}
			
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const viewFilePath: string = (view as any).file.path;
			const canvas: ExtendedCanvas = view.canvas;
			
			
			if(view.originalAddEdge) canvas.addEdge = view.originalAddEdge;
			if(view.originalAddNode) canvas.addNode = view.originalAddNode;
			if(view.originalRemoveNode) canvas.removeNode = view.originalRemoveNode;
			if(view.originalMenuRender) canvas.menu.render = view.originalMenuRender;


			view.originalMenuRender = canvas.menu.render;
			canvas.menu.render = async function(redraw: boolean) {
				if(!view.originalMenuRender) return;
				view.originalMenuRender.call(canvas.menu, redraw);

				if(!redraw) return;
			
				const menuEl: HTMLElement = canvas.menu.menuEl;
				const button = menuEl.createEl("button", "clickable-icon");
				setTooltip(button, "Execute script");
				setIcon(button, "play");
				
				button.onclick = function () {
					that.handleRun();
				}

			}



			view.originalAddEdge = canvas.addEdge;
			canvas.addEdge = async function(edge: ExtendedEdge) {
				if(!view.originalAddEdge) return;
				view.originalAddEdge.call(canvas, edge);
				edge.lastTo = edge.to.node.id;

				// Save to refresh canvas.edges dictionary
				canvas.requestSave();
				refreshNode(canvas, edge.from.node.id);

				if(edge.originalEdgeUpdate) edge.update = edge.originalEdgeUpdate;
				edge.originalEdgeUpdate = edge.update;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				edge.update = async function(...args: any[]) {
					if(!edge.originalEdgeUpdate) return;
					edge.originalEdgeUpdate.apply(this, args);

					// Check if the edge is pointing to a different node
					if (edge.lastTo !== edge.to.node.id)
					{
						// Set new last pointing to node
						const lastTo = edge.lastTo;
						edge.lastTo = edge.to.node.id;
						
						// Save to refresh canvas.edges dictionary
						canvas.requestSave();
						// Refresh the node that the edge was pointed to and the one which it now points to
						refreshNode(canvas, lastTo);
						refreshNode(canvas, edge.to.node.id);
					}
				}
			};


			const originalRemoveEdge = canvas.removeEdge;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			canvas.removeEdge = async function(...args: any[]) {
				
				originalRemoveEdge.apply(this, args);

				// Save to refresh canvas.nodes dictionary
				canvas.requestSave();

				// Refresh the both connections of the edge
				refreshNode(canvas, args[0].from.node.id);
				refreshNode(canvas, args[0].to.node.id);
			};


			view.originalAddNode = canvas.addNode;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			canvas.addNode = async function(node: ExtendedNode) {
				
				if(!view.originalAddNode) return;
				
				if(!node.skipAddNode)
					view.originalAddNode.call(this, node);

				
				if(node.originalMoveAndResize === undefined)
				{
					node.originalMoveAndResize = node.moveAndResize;
					node.moveAndResize = async function(newPositionAndSize: Box) {
						if(!node.originalMoveAndResize) return;

						canvas.requestSave();
						
						const isInSelected = function(canvas: ExtendedCanvas, id: string) {
							for (const element of canvas.selection) {
								if (element.id === id) {
									return true;
								}
							}
							return false;
						}

						const nodeData = canvas.data.nodes.find(searchNode => searchNode.id === node.id);

						if(nodeData === undefined) return;

						if(node.preventRecursion) {
							node.originalMoveAndResize.call(this, newPositionAndSize);
							return;
						}

						if(!isInSelected(canvas, node.id)) return;

						const oldPosition = {x: node.x, y: node.y};
						const newPosition = {x: newPositionAndSize.x, y: newPositionAndSize.y};

						const translationX = newPosition.x - oldPosition.x;
						const translationY = newPosition.y - oldPosition.y;

						const workflowNodes = await cachedGetWorkflowNodes(this, canvas, node.id);
						if (workflowNodes === undefined)
						{
							node.preventRecursion = true;
							node.moveTo(newPositionAndSize);
							node.preventRecursion = false;
							canvas.requestSave();
							return;
						}

						if(workflowNodes.groupNode === undefined) return;



						const settingsNode = canvas.nodes.get(workflowNodes.settingsNode.id);
						if (settingsNode === undefined) return;

						const settingsNodePosition = { x: settingsNode.x + translationX, y: settingsNode.y + translationY };

						const groupNode = canvas.nodes.get(workflowNodes.groupNode.id);
						if (groupNode === undefined) return;

						const moveQueue = [];
						moveQueue.push({node: settingsNode, position: settingsNodePosition});

						const text = await extractLanguageText(this.app, workflowNodes.settingsNode, canvasBlockSettingsLanguageName);
						if (text === null) return;
						const scriptSettings: CanvasBlockSetting = JSON.parse(text);

						let numInput = 0;
						let numOutput = 0;
					
						for (const connectionName in scriptSettings.ioConnections)
						{
							const ioConnection: IOConnection = scriptSettings.ioConnections[connectionName];
					
							const numberOfConnectionsAbove: number = ioConnection.direction === "input" ? numInput : numOutput;
							const offset: number = ioConnection.direction === "input" ? 0 : workflowNodesDimensions.scriptWidth - workflowNodesDimensions.connectionPointWidth;
					
							for (const connectionNodeData of workflowNodes.connectionNodes)
							{
								const connectionPointText = await extractLanguageText(this.app, connectionNodeData, canvasBlockConnectionPointLanguageName);
								if(connectionPointText === null) continue;
								const connectionPointData: ConnectionPointData = JSON.parse(connectionPointText);

								if (connectionPointData.name === connectionName)
								{
									const connectionNode = canvas.nodes.get(connectionNodeData.id);
									if (connectionNode === undefined) return;

									moveQueue.push({node: connectionNode, position: {
										x: settingsNodePosition.x + offset,
										y: settingsNodePosition.y + workflowNodesDimensions.scriptHeight + workflowNodesDimensions.padding + workflowNodesDimensions.connectionPointHeight * numberOfConnectionsAbove,
									}});
									break;
								}
							}

							if (ioConnection.direction === "input") numInput++;
							else numOutput++;
						}

						moveQueue.push({node: groupNode, position: {
							x: settingsNodePosition.x - workflowNodesDimensions.padding,
							y: settingsNodePosition.y - workflowNodesDimensions.padding,
						}});
		
						const moveQueueIds = [];
						for (const element of moveQueue) {
							moveQueueIds.push(element.node.id);
						}

						const relevantSelectedNodes = [];
						for (const element of canvas.selection) {
							if (moveQueueIds.includes(element.id)) {
								relevantSelectedNodes.push(element);
							}
						}

						if(relevantSelectedNodes.length === 0) return;
						if(relevantSelectedNodes[0].id !== node.id) return;

						for (const element of moveQueue) {
							element.node.preventRecursion = true;
							element.node.moveTo(element.position);
							element.node.preventRecursion = false;
						}
						canvas.requestSave();
					}

				}
			};

			// Add the moveAndResize to existing nodes with a 200ms delay
			for (const node of canvas.nodes.values()) {
				setTimeout(() => {
					node.skipAddNode = true;
					canvas.addNode(node);
				}, 100);
			}
				


			view.originalRemoveNode = canvas.removeNode;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			canvas.removeNode = async function(deletedNode: any) {
				if(!view.originalRemoveNode) return;

				// Save to refresh canvas.edges dictionary
				canvas.requestSave();

				const isViewLoaded: boolean = view._loaded;
				if(!isViewLoaded) {view.originalRemoveNode.call(canvas, deletedNode); return;}

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const newViewFilePath: string = (view as any).file.path;
				if (viewFilePath != newViewFilePath) {view.originalRemoveNode.call(canvas, deletedNode); return;}

				const workflowNodes = await getWorkflowNodes(this, canvas, deletedNode.id);
				if (workflowNodes === undefined) 
				{
					view.originalRemoveNode.call(canvas, deletedNode);
					canvas.requestSave(); 
					return;
				}

				const settingsNode = canvas.nodes.get(workflowNodes.settingsNode.id)
				if (settingsNode !== undefined)
					view.originalRemoveNode.call(canvas, settingsNode);

				if (workflowNodes.groupNode !== undefined)
				{
					const groupNode = canvas.nodes.get(workflowNodes.groupNode.id)
					if (groupNode !== undefined)
						view.originalRemoveNode.call(canvas, groupNode);
				}


				for (const node of workflowNodes.connectionNodes)
				{
					const deleteNode = canvas.nodes.get(node.id);
					if (deleteNode !== undefined)
						view.originalRemoveNode.call(canvas, deleteNode);
				}

				canvas.requestSave();
			};

		}));


		// Hide code blocks
		this.registerMarkdownCodeBlockProcessor(pythonCodeBlockLanguageName, () => {});
		this.registerMarkdownCodeBlockProcessor(canvasBlockSettingsLanguageName, () => {});

		// Render script connections
		this.registerMarkdownCodeBlockProcessor(canvasBlockConnectionPointLanguageName, async (source, el) =>
		{
			const connectionPointData: ConnectionPointData = JSON.parse(source);

			const view : CanvasView|null = this.app.workspace.getActiveViewOfType(ItemView) as CanvasView;
			if(view === null) return;
			if(!view.hasOwnProperty('canvas')) {
				return;
			}
			
			const canvas: ExtendedCanvas = view.canvas;
			const scriptNode = canvas.data.nodes.find(node => node.id === connectionPointData.scriptID);
			if (scriptNode === undefined) return;
			const scriptData: string|null = await extractLanguageText(this.app, scriptNode, canvasBlockSettingsLanguageName);

			if(scriptData === null) return;
			
			const scriptSettings: CanvasBlockSetting = JSON.parse(scriptData);

			const ioConnection: IOConnection|undefined = scriptSettings.ioConnections[connectionPointData.name];
			if(ioConnection === undefined) return;
			
			const connectionNode = canvas.data.nodes.find(node => node.type === "text" && node.text.includes(source));
			if(connectionNode === undefined) return;

			const connectionEdge = canvas.data.edges.find(edge => edge.toNode === connectionNode.id || edge.fromNode === connectionNode.id)

			let circle: string;
			if (connectionEdge === undefined)
				circle = "◯";
			else
				circle = "⬤";

			
			let color: string;
			switch (ioConnection.type) {
				case "image":
					color = "#ffff00";
					break;

				case "text":
					color = "#AA5555";
					break;

				case "integer":
					color = "#06aacf";
					break;

				case "float":
					color = "#13d493";
					break;

				case "file":
					color = "#55FF55";
					break;

				case "any":
					color = "#0476c2";
					break;
			
				default:
					color = "#555555"
					break;
			}

			const circleSpan: HTMLSpanElement = createSpan({ text: circle });
			circleSpan.setCssStyles({ color: color });

			if(ioConnection.direction === "input")
			{
				const span = el.createSpan({ cls: "canvasblock-input-node" });
				span.appendChild(circleSpan);
				span.appendText(" " + connectionPointData.name);
			}
			else
			{
				const span = el.createSpan({ cls: "canvasblock-output-node" });
				span.appendText(connectionPointData.name + " ");
				span.appendChild(circleSpan);
			}

		});

		//this.registerEvent()
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
	getDataFolder()
	{
		const folder = this.settings.dataFolder;

		if (folder === "/") return "";

		return folder;
	}

	async handleRun()
	{
		const view : CanvasView|null = this.app.workspace.getActiveViewOfType(ItemView) as CanvasView;
		if(view === null) return;
		if(!view.hasOwnProperty('canvas')) {
			new Notice('This command requires a canvas file to be open');
			return;
		}

		const canvas: ExtendedCanvas = view.canvas;

		const selected = canvas.selection;
		if (selected.size === 0) {
			new Notice('This command requires a node to be selected');
			return;
		}

		// Gets the DOM object and ID
		const selectedNode = selected.values().next().value;
		const selectionID = selectedNode.id;

		const workflowNodes = await getWorkflowNodes(this, canvas, selectionID); 

		if (workflowNodes)
		{
			if (workflowNodes.groupNode === undefined) return;
			handleWorkflowFromGroup(this, canvas, workflowNodes.groupNode);
			return;
		}


		const closestID : string|null = await canvasClosestNodeToPositionInBounds(canvas, selectedNode.bbox, 
			(node: AllCanvasNodeData) => { return node.id === selectionID });

		this.handleCommand(canvas, selectionID, closestID);
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
		const selectedData = this.getNodeByID(canvas, selectedID);
		const selectedIsValidScript = await checkContainsLanguage(this.app, selectedData, pythonCodeBlockLanguageName);

		if (!selectedIsValidScript && otherID === null) { 
			new Notice('No valid scripts are selected');
			return;
		}

		let scriptID: string;
		let parameterID: string|null;

		if (selectedIsValidScript)
		{
			scriptID = selectedID;
			parameterID = otherID;
		}
		else
		{
			if(otherID === null) return;
			const otherData = this.getNodeByID(canvas, otherID);
			const otherIsValidScript = await checkContainsLanguage(this.app, otherData, pythonCodeBlockLanguageName);
			if (!otherIsValidScript) {
				new Notice('No valid scripts are selected');
				return;
			}
			
			scriptID = otherID;
			parameterID = selectedID;
		}


		let parameterData = {};
		if (parameterID !== null)
			parameterData = this.getNodeByID(canvas, parameterID);
		const scriptData = this.getNodeByID(canvas, scriptID);

		// Finds all edges that point into the script node
		const arrowParamterEdges = canvas.data.edges.filter(edge => edge.toNode === scriptID);

		// Gets the IDs of nodes pointing to the script node
		const arrowParameterIDs = arrowParamterEdges.map(edge => edge.fromNode);

		// Finds the nodes from the IDs
		const arrowParameters = canvas.data.nodes.filter((node) => arrowParameterIDs.includes(node.id));

		// Gets the string within the ```pycanvasblock ``` to run as code
		const scriptCode = await extractLanguageText(this.app, scriptData, pythonCodeBlockLanguageName);
		if (scriptCode === null) return;

		
		const adapter : ExtendedDataAdapter = this.app.vault.adapter;

		const injectionData = {
			execution_type: 'simple',
			parameter_data: parameterData,
			script_data: scriptData,
			arrow_parameters: arrowParameters,
			vault_path: adapter.basePath,
			plugin_folder: this.getDataFolder(),
			has_parameter: parameterID !== null,
		};

		executePythonString(this, canvas, scriptCode, injectionData)
	}
}
