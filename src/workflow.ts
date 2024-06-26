import CanvasBlocksPlugin, { boundingBoxFromNode, canvasClosestNodeToPositionInBounds, checkContainsLanguage, pythonCodeBlockLanguageName, canvasBlockSettingsLanguageName, canvasBlockConnectionPointLanguageName, extractLanguageText, ConnectionPointData, CanvasBlockSetting, IOConnection, ExtendedDataAdapter, getNodeText, BoundingBox } from "./main";
import { CanvasView, ExtendedCanvas } from "./canvasdefinitions";
import { BaseMessage, defaultMessageHandler, executePythonString } from "./pythonexecution";

import { TFile, ItemView, Notice, TAbstractFile } from "obsidian";
import { AllCanvasNodeData, CanvasGroupData, CanvasEdgeData, CanvasFileData, CanvasTextData } from "obsidian/canvas";



export function refreshNode(canvas: ExtendedCanvas, id: string)
{
    const node = canvas.nodes.get(id);
    if(node === undefined) return;
    
    const text = node.text;
    if(text === undefined) return;

    // Set the text
    if(node.child === undefined) return;
    node.child.previewMode.renderer.set("");

    // Asynchronously wait for the queued rendering task to be null
    function waitForRenderQueue() {
        setTimeout(() => {
            // Ignore errors from switching canvas files
            try {
                if (node.child.previewMode.renderer.queued != null) {
                    waitForRenderQueue(); // Check again after a short delay
                } else {
                    // Once the queued rendering task is null, proceed to set the text
                    setTimeout(() => {
                        node.child.previewMode.renderer.set(text);
                    }, 0);
                }
            // eslint-disable-next-line no-empty
            } catch (error) {}
        }, 0);
    }
    

    waitForRenderQueue(); // Start waiting for the render queue to be null
}


export interface WorkflowNodes
{
    settingsNode: AllCanvasNodeData;
    connectionNodes: AllCanvasNodeData[];
    groupNode: AllCanvasNodeData|undefined;
}

export async function getWorkflowNodes(plugin: CanvasBlocksPlugin, view: CanvasView, canvas: ExtendedCanvas, selectedNodeID: string): Promise<WorkflowNodes|undefined> {
    const selectedNode = canvas.nodes.get(selectedNodeID);
    if(selectedNode === undefined) return;

    const selectedNodeData: AllCanvasNodeData|undefined = canvas.data.nodes.find(node => node.id === selectedNode.id);
    if(selectedNodeData === undefined) return;

    // Check if the node contains a code block of language canvasBlockSettingsLanguageName
    const isSettingsNode: boolean = await checkContainsLanguage(plugin.app, selectedNodeData, canvasBlockSettingsLanguageName)
    let settingsNodeID = selectedNodeData.id;

    if(!isSettingsNode){
        // If it is a text node, check if it is a connection point
        if(selectedNodeData.type === "text"){
            const languageText = await extractLanguageText(plugin.app, selectedNodeData, canvasBlockConnectionPointLanguageName);
            if(languageText === null) return;
            const connectionPointData: ConnectionPointData = JSON.parse(languageText);
            settingsNodeID = connectionPointData.scriptID;
        }
        // If it is a group node, check if there is a settings node within its bounds
        else if(selectedNodeData.type === "group")
        {
            console.log(selectedNode.label);
            if (selectedNodeData.label !== "\u200E") return;
            
            const possibleMainNodeID = await canvasClosestNodeToPositionInBounds(canvas, boundingBoxFromNode(selectedNode), async (testNode: AllCanvasNodeData) => {
                const hasCode = await checkContainsLanguage(plugin.app, testNode, canvasBlockSettingsLanguageName);
                return !hasCode;
            });

            if(possibleMainNodeID === null) return;
            settingsNodeID = possibleMainNodeID;
        }
        else return;
    }

    // Get the settings node
    const settingsNode = canvas.data.nodes.find(node => node.id === settingsNodeID);
    if(settingsNode === undefined) return;

    // Get all connection nodes that are connected to the settings node
    const connectionNodes: AllCanvasNodeData[] = [];
    for (const node of canvas.data.nodes)
    {
        const text = await extractLanguageText(plugin.app, node, canvasBlockConnectionPointLanguageName);
        if (text === null) continue;
        const connectionPointData: ConnectionPointData = JSON.parse(text);

        if (connectionPointData.scriptID === settingsNodeID)
        {
            connectionNodes.push(node);
        }
    }

    // Get the smallest possible bounding box that contains the settings node and all connection nodes
    let totalBoundingBox: BoundingBox|undefined = undefined;
    for (const node of [...connectionNodes, settingsNode])
    {
        const nodeBoundingBox = boundingBoxFromNode(node);
        if(totalBoundingBox === undefined) totalBoundingBox = nodeBoundingBox;
        else
        {
            totalBoundingBox = {
                minX: Math.min(nodeBoundingBox.minX, totalBoundingBox.minX),
                minY: Math.min(nodeBoundingBox.minY, totalBoundingBox.minY),
                maxX: Math.max(nodeBoundingBox.maxX, totalBoundingBox.maxX),
                maxY: Math.max(nodeBoundingBox.maxY, totalBoundingBox.maxY),
            };
        }
    }
    if (totalBoundingBox === undefined) return;

    // Get all groups which overlap and fully contain the bounding box
    const groups: AllCanvasNodeData[] = [];
    for (const node of canvas.data.nodes)
    {
        if (node.type !== "group") continue;
        const nodeBoundingBox = boundingBoxFromNode(node);
        if (nodeBoundingBox.minX <= totalBoundingBox.minX && nodeBoundingBox.maxX >= totalBoundingBox.maxX && nodeBoundingBox.minY <= totalBoundingBox.minY && nodeBoundingBox.maxY >= totalBoundingBox.maxY)
        {
            groups.push(node);
        }
    }

    // Find the distance between each corner of the group bounding box and the smallest allowed bounding box
    let minDistance = Infinity;
    let closestGroup: AllCanvasNodeData|undefined = undefined;
    for (const group of groups)
    {
        const groupBoundingBox = boundingBoxFromNode(group);

        const minXDistance = Math.abs(groupBoundingBox.minX - totalBoundingBox.minX);
        const minYDistance = Math.abs(groupBoundingBox.minY - totalBoundingBox.minY);
        const maxXDistance = Math.abs(groupBoundingBox.maxX - totalBoundingBox.maxX);
        const maxYDistance = Math.abs(groupBoundingBox.maxY - totalBoundingBox.maxY);

        const sumDistance = minXDistance + minYDistance + maxXDistance + maxYDistance;

        if (sumDistance < minDistance)
        {
            minDistance = sumDistance;
            closestGroup = group;
        }
    }

    return { settingsNode: settingsNode, connectionNodes: connectionNodes, groupNode: closestGroup };

}

export async function handleWorkflowFromGroup(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, selectedData: CanvasGroupData) { 
    const nodes = canvas.data.nodes;  

    const closestID = await canvasClosestNodeToPositionInBounds(canvas, boundingBoxFromNode(selectedData), 
        async (node: AllCanvasNodeData) => { 
            if(node.id === selectedData.id) return true;
            const hasCode = await checkContainsLanguage(plugin.app, node, pythonCodeBlockLanguageName);
            if (!hasCode) return true;

            const hasSettings = await checkContainsLanguage(plugin.app, node, canvasBlockSettingsLanguageName);
            if (!hasSettings) return true;
            return false;
        });

    if (closestID === null) return;

    const startScriptNode: AllCanvasNodeData|undefined = nodes.find(node => node.id === closestID);
    if (startScriptNode === undefined) return;

    executeWorkflow(plugin, canvas, startScriptNode);
}

async function executeWorkflow(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, startScriptNode: AllCanvasNodeData)
{
    const nodes: AllCanvasNodeData[] = canvas.data.nodes;
    const edges: CanvasEdgeData[] = canvas.data.edges;

    const scriptConnectionPoints: { [key: string]: AllCanvasNodeData[] } = {};

    // Key is the to side, value is the from side
    const dataFlow: { [key: string]: string } = {};

    // The key is the value from dataFlow, the value is json data
    const executionData: { [key: string]: string } = {};

    for (const node of nodes)
    {
        const text = await extractLanguageText(plugin.app, node, canvasBlockConnectionPointLanguageName);
        if (text === null) continue;
        const connectionPointData: ConnectionPointData = JSON.parse(text);

        if (!scriptConnectionPoints[connectionPointData.scriptID]) {
            scriptConnectionPoints[connectionPointData.scriptID] = [];
        }
        scriptConnectionPoints[connectionPointData.scriptID].push(node);
    }


    const executeStack: AllCanvasNodeData[] = [];
    const searchQueue: AllCanvasNodeData[] = [startScriptNode];

    // Creates a list of scripts which need to be executed in order
    while (searchQueue.length > 0)
    {
        // Get the next script to trace the connections of
        const currentScript = searchQueue.shift();
        if(currentScript === undefined) continue;

        // Add the current script as the next script to be executed
        if (!executeStack.includes(currentScript)) {
            executeStack.push(currentScript);
        }

        // Get the settings (inputs and outputs) of the current script
        const settingsLanguageBlock = await extractLanguageText(plugin.app, currentScript, canvasBlockSettingsLanguageName);
        if(settingsLanguageBlock === null) continue;
        const scriptSettings: CanvasBlockSetting = JSON.parse(settingsLanguageBlock);

        // Get an array of connection nodes for the script
        const connectionPoints = scriptConnectionPoints[currentScript.id];
        for (const connectionPoint of connectionPoints)
        {
            // Get the connection point information (script and input/output information)
            const connectionPointLanguageBlock = await extractLanguageText(plugin.app, connectionPoint, canvasBlockConnectionPointLanguageName);
            if(connectionPointLanguageBlock === null) continue;
			const connectionPointData: ConnectionPointData = JSON.parse(connectionPointLanguageBlock);

            // Get the relevant information from the script about this connection
            const ioConnection = scriptSettings.ioConnections[connectionPointData.name];
            if(ioConnection === undefined) continue;

            // Ignore all output connnections as only the inputs are needed to trace back the path of scripts
            if(ioConnection.direction === "output") continue;

            // Get the edges that connect the input connection node to the data / output connection node of another script
            const connectionEdge = edges.find(edge => edge.toNode === connectionPoint.id);
            if(connectionEdge === undefined) continue;

            const otherConnectionID = connectionEdge.fromNode;
            if(otherConnectionID === undefined) continue;
            
            // Get the node attached to this edge
            const otherConnectionPoint = nodes.find(node => node.id === otherConnectionID);
            if(otherConnectionPoint === undefined) continue;

            // Try to get the connection data
            const otherConnectionPointLanguageBlock = await extractLanguageText(plugin.app, otherConnectionPoint, canvasBlockConnectionPointLanguageName);
            
            // If it is not a connection, process the node as a file/text node
            if(otherConnectionPointLanguageBlock === null)
            {
                // Immediately add the node data as there is no script to process first
                const flowName = `${otherConnectionID}_NODE}`;
                dataFlow[`${currentScript.id}_${connectionPointData.name}`] = flowName

                switch (ioConnection.type) {
                    case "text":
                    case "integer":
                    case "float":
                    {
                        const text: string|null = await getNodeText(plugin.app, otherConnectionPoint);
                        if (text === null)
                        {
                            new Notice(`Failed to load node as text`);
                            return;
                        }
                        executionData[flowName] = text;
                        break;
                    }

                    case "image":
                    {
                        if (otherConnectionPoint.type !== "file"){
                         new Notice("Attempted to load a non-image node (${otherConnectionPoint.file}) as an image");
                            return;
                        }

                        const file: TAbstractFile|null = plugin.app.vault.getAbstractFileByPath(otherConnectionPoint.file);
                        if (file === null || !(file instanceof TFile)) {
                            new Notice(`Attempt to load image ${otherConnectionPoint.file} failed`);
                            return;
                        }

                        const image = await plugin.app.vault.readBinary(file);
                        const base64Image = Buffer.from(image).toString('base64');
                        executionData[flowName] = base64Image;

                        break;
                    }

                    case "file":
                    case "any":
                    default:
                        executionData[flowName] = JSON.stringify(otherConnectionPoint);
                        break;
                }

                continue;
            }

			const otherConnectionPointData: ConnectionPointData = JSON.parse(otherConnectionPointLanguageBlock);


            const otherScript = nodes.find(node => node.id === otherConnectionPointData.scriptID);
            if(otherScript === undefined) continue;

            if (!searchQueue.includes(otherScript)) {
                searchQueue.push(otherScript);
            }

            dataFlow[`${currentScript.id}_${connectionPointData.name}`] = `${otherScript.id}_${otherConnectionPointData.name}`;
        }
    }

    while(executeStack.length > 0)
    {
        const currentScript = executeStack.pop();
        if(currentScript === undefined) continue;

        const sucess = await executeScript(plugin, canvas, currentScript, dataFlow, executionData);
        if(!sucess) {
            new Notice("Workflow execution stopped because a script failed");
            break;
        }

    }
}

async function executeScript(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, scriptNode: AllCanvasNodeData, dataFlow: { [key: string]: string }, executionData: { [key: string]: string }): Promise<boolean>
{
    const scriptLanguageBlock = await extractLanguageText(plugin.app, scriptNode, pythonCodeBlockLanguageName);
    if(scriptLanguageBlock === null) return false;

    const settingsLanguageBlock = await extractLanguageText(plugin.app, scriptNode, canvasBlockSettingsLanguageName);
    if(settingsLanguageBlock === null) return false;

    const scriptSettings: CanvasBlockSetting = JSON.parse(settingsLanguageBlock);

    const inputData: { [key: string]: string } = {};
    const outputData: { [key: string]: null } = {};

    for (const connectionName in scriptSettings.ioConnections)
    {
        const ioConnection: IOConnection = scriptSettings.ioConnections[connectionName];
        if (ioConnection.direction === "output") 
        {
            outputData[connectionName] = null;
            continue;
        }

        const flow = dataFlow[`${scriptNode.id}_${connectionName}`];
        const data = executionData[flow];

        inputData[connectionName] = data
    }

    const adapter : ExtendedDataAdapter = plugin.app.vault.adapter;
    const injectionData = {
        execution_type: 'workflow',
        in_data: inputData,
        out_data: outputData,
        script_settings: scriptSettings,
        script_data: scriptNode,
        vault_path: adapter.basePath,
        plugin_folder: plugin.getDataFolder(),
    };


    const messageHandler = async (canvas: ExtendedCanvas, message: BaseMessage): Promise<BaseMessage|null|undefined> => {
        const response = await defaultMessageHandler(canvas, message)
        if(response === null) return;

        const commandType = message.command;
        if(commandType === "RETURN_OUTPUT")
        {
            const outData = message.data;
            for (const key in outData) {
                if (outData.hasOwnProperty(key)) {
                    executionData[`${scriptNode.id}_${key}`] = outData[key];
                }
            }
        }
    }

    const sucess = await executePythonString(plugin, canvas, scriptLanguageBlock + "\n\n#Generated by plugin\n_return_output_data()", injectionData, messageHandler)
    return sucess;
}

export async function addWorkflowScript(plugin: CanvasBlocksPlugin, scriptFile: TFile) {
	const view: CanvasView | null = this.app.workspace.getActiveViewOfType(ItemView);
	if (view === null) return;
	if (!view.hasOwnProperty('canvas')) {
		new Notice("A canvas must be open to run this command");
		return;
	}

	const canvas: ExtendedCanvas = view.canvas;
	const scriptText: string = await app.vault.read(scriptFile);

    const text = await extractLanguageText(plugin.app, scriptText, canvasBlockSettingsLanguageName);
    if (text === null) return;
    const scriptSettings: CanvasBlockSetting = JSON.parse(text);

    const padding = 20;
    const scriptWidth = 400;
    const scriptHeight = 60;
    const connectionPointWidth = 180;
    const connectionPointHeight = 50;

    const tx = canvas.tx;
    const ty = canvas.ty;

    const scriptNode: CanvasFileData = canvas.createFileNode({
        file: scriptFile,
        pos: {
            x: tx,
            y: ty,
        },
        size: {
            width: scriptWidth,
            height: 60
        },
        save: false,
        focus: false,
    });
    

    let numInput = 0;
    let numOutput = 0;

    const connectionNodes: CanvasTextData[] = [];
    for (const connectionName in scriptSettings.ioConnections)
    {
        const ioConnection: IOConnection = scriptSettings.ioConnections[connectionName];

        const numberOfConnectionsAbove: number = ioConnection.direction === "input" ? numInput : numOutput;
        const offset: number = ioConnection.direction === "input" ? 0 : scriptWidth - connectionPointWidth;

        const connectionNode = canvas.createTextNode({
            text: `\`\`\`${canvasBlockConnectionPointLanguageName}
{
    "name": "${connectionName}",
    "scriptID": "${scriptNode.id}"
}
\`\`\``,
            pos: {
                x: tx + offset,
                y: ty + scriptHeight + padding + connectionPointHeight * numberOfConnectionsAbove,
            },
            size: {
                width: connectionPointWidth,
                height: connectionPointHeight
            },
            save: false,
            focus: false,
        });
        connectionNodes.push(connectionNode);


        if (ioConnection.direction === "input") numInput++;
        else numOutput++;
    }

    canvas.createGroupNode({
        label: "\u200E",
        pos: {
            x: tx-padding,
            y: ty-padding,
        },
        size: {
            width: scriptWidth + 2*padding,
            height: padding + scriptHeight + padding + connectionPointHeight * Math.max(numInput, numOutput) + padding
        },
        save: false,
        focus: false,
    })
    canvas.requestSave();
}
