import CanvasBlocksPlugin, { boundingBoxFromNode, canvasClosestNodeToPositionInBounds, checkContainsLanguage, extractLanguageText, ConnectionPointData, CanvasBlockSetting, IOConnection, getNodeText, BoundingBox, checkContainsScript } from "./main";
import { CanvasView, ExtendedCanvas } from "./canvasdefinitions";

import { TFile, ItemView, Notice, TAbstractFile } from "obsidian";
import { AllCanvasNodeData, CanvasGroupData, CanvasEdgeData, CanvasFileData, CanvasTextData } from "obsidian/canvas";
import { TimedCache } from "./cache";
import { canvasBlockConnectionPointLanguageName, canvasBlockSettingsLanguageName, workflowNodesDimensions } from "./constants";
import { BaseMessage, defaultMessageHandler, executeScript } from "./scriptexecution";



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
    groupNode: CanvasGroupData|undefined;
}

export async function getWorkflowNodes(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, selectedNodeID: string): Promise<WorkflowNodes|undefined> {
    const selectedNode = canvas.nodes.get(selectedNodeID);
    if(selectedNode === undefined) return;

    const selectedNodeData: AllCanvasNodeData|undefined = canvas.data.nodes.find(node => node.id === selectedNode.id);
    if(selectedNodeData === undefined) return;

    // Check if the node contains a code block of language canvasBlockSettingsLanguageName
    let isSettingsNode: boolean = await checkContainsLanguage(plugin.app, selectedNodeData, canvasBlockSettingsLanguageName)
    if (isSettingsNode)
    {
        const settingsText = await extractLanguageText(plugin.app, selectedNodeData, canvasBlockSettingsLanguageName);
        if(settingsText === null) return;
        const settings: CanvasBlockSetting = JSON.parse(settingsText);
        isSettingsNode = settings.type !== "simple";
    }

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
            if (selectedNodeData.label !== workflowNodesDimensions.groupLabel) return;
            
            const possibleMainNodeID = await canvasClosestNodeToPositionInBounds(canvas, boundingBoxFromNode(selectedNode), async (testNode: AllCanvasNodeData) => {
                let hasCode = await checkContainsLanguage(plugin.app, testNode, canvasBlockSettingsLanguageName);
                if (hasCode) {
                    const settingsText = await extractLanguageText(plugin.app, testNode, canvasBlockSettingsLanguageName);
                    if (settingsText === null) return false;
                    const settings: CanvasBlockSetting = JSON.parse(settingsText);
                    hasCode = settings.type !== "simple";
                }

                return !hasCode;
            });

            if(possibleMainNodeID === null) return;
            settingsNodeID = possibleMainNodeID;
        }
        else return;
    }

    // Get the settings node
    if(canvas.data.nodes === undefined) return;
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
    const groups: CanvasGroupData[] = [];
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
    let closestGroup: CanvasGroupData|undefined = undefined;
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

// Maps all nodes' ids to the main node's id
const workflowNodesIDsCache: TimedCache<string, string|undefined> = new TimedCache();

// Maps the main node's id to all nodes in the workflow
const workflowNodesCache: TimedCache<string, WorkflowNodes|undefined> = new TimedCache();

export async function cachedGetWorkflowNodes(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, selectedNodeID: string): Promise<WorkflowNodes|undefined> {
    
    // Check if the data is cached
    if(workflowNodesIDsCache.has(selectedNodeID)) {
        const mainNodeID = workflowNodesIDsCache.get(selectedNodeID);
        if (mainNodeID === undefined) return undefined;

        const workflowNodes = workflowNodesCache.get(mainNodeID);
        if (workflowNodes !== undefined)
            return workflowNodes;
    }

    // Cached data has not been found

    const workflowNodes = await getWorkflowNodes(plugin, canvas, selectedNodeID);

    if(workflowNodes === undefined)
    {
        workflowNodesIDsCache.set(selectedNodeID, undefined);
        return undefined;
    }

    if(workflowNodes.groupNode === undefined)
    {
        // Return without caching to avoid timing issues causing the group to not be found
        return workflowNodes;
    }

    workflowNodesCache.set(workflowNodes.settingsNode.id, workflowNodes);
    workflowNodesIDsCache.set(workflowNodes.settingsNode.id, workflowNodes.settingsNode.id);

    if(workflowNodes.groupNode !== undefined)
        workflowNodesIDsCache.set(workflowNodes.groupNode.id, workflowNodes.settingsNode.id);

    for (const connectionNode of workflowNodes.connectionNodes)
        workflowNodesIDsCache.set(connectionNode.id, workflowNodes.settingsNode.id);

    return workflowNodes;
}


export async function handleWorkflowFromGroup(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, selectedData: CanvasGroupData) { 
    const nodes = canvas.data.nodes;  

    const closestID = await canvasClosestNodeToPositionInBounds(canvas, boundingBoxFromNode(selectedData), 
        async (node: AllCanvasNodeData) => { 
            if(node.id === selectedData.id) return true;
            const hasCode = await checkContainsScript(plugin.app, node);
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
                            new Notice("Failed to load node as text");
                            return;
                        }
                        executionData[flowName] = text;
                        break;
                    }

                    case "image":
                    {
                        if (otherConnectionPoint.type !== "file"){
                         new Notice(`Attempted to load a non-image node (${otherConnectionPoint.file}) as an image`);
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

        const sucess = await executeWorkflowScript(plugin, canvas, currentScript, dataFlow, executionData);
        if(!sucess) {
            new Notice("Workflow execution stopped because a script failed");
            break;
        }

    }
}

async function executeWorkflowScript(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, scriptNode: AllCanvasNodeData, dataFlow: { [key: string]: string }, executionData: { [key: string]: string }): Promise<boolean>
{
    const settingsLanguageBlock = await extractLanguageText(plugin.app, scriptNode, canvasBlockSettingsLanguageName);
    if(settingsLanguageBlock === null) return false;

    const scriptSettings: CanvasBlockSetting = JSON.parse(settingsLanguageBlock);


    // Add the workflow type to the canvasblocksettings block if it doesn't exist
    const processScriptText = await getNodeText(plugin.app, scriptNode);
    if(processScriptText === null) return false;


    if(scriptSettings.type !== "simple") {

        scriptSettings.type = "workflow";

        // Replace old settings with new settings (keep the rest of the file)
        const newSettingsText = JSON.stringify(scriptSettings, null, "\t");
        const newText = processScriptText.replace(settingsLanguageBlock, newSettingsText);

        // Modify the file
        const file = plugin.app.vault.getFileByPath(scriptNode.file);
        if (file === null) return false;
        plugin.app.vault.modify(file, newText);
        new Notice('WARNING: Settings type not set to workflow. This has been automatically fixed (Workflow script)', 10000);
    }



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

    const injectionData = {
        in_data: inputData,
        out_data: outputData,
        script_settings: scriptSettings,
        script_data: scriptNode
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


    const sucess = await executeScript(plugin, canvas, scriptNode, injectionData, "workflow", messageHandler);
    return sucess;
}

export async function addWorkflowScript(plugin: CanvasBlocksPlugin, scriptFile: TFile, tx: number, ty: number) {
	const view: CanvasView | null = plugin.app.workspace.getActiveViewOfType(ItemView) as CanvasView;
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

    const scriptNode: CanvasFileData = canvas.createFileNode({
        file: scriptFile,
        pos: {
            x: tx,
            y: ty,
        },
        size: {
            width: workflowNodesDimensions.scriptWidth,
            height: workflowNodesDimensions.scriptHeight
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
        const offset: number = ioConnection.direction === "input" ? 0 : workflowNodesDimensions.scriptWidth - workflowNodesDimensions.connectionPointWidth;

        const connectionNode = canvas.createTextNode({
            text: `\`\`\`${canvasBlockConnectionPointLanguageName}
{
    "name": "${connectionName}",
    "scriptID": "${scriptNode.id}"
}
\`\`\``,
            pos: {
                x: tx + offset,
                y: ty + workflowNodesDimensions.scriptHeight + workflowNodesDimensions.padding + workflowNodesDimensions.connectionPointHeight * numberOfConnectionsAbove,
            },
            size: {
                width: workflowNodesDimensions.connectionPointWidth,
                height: workflowNodesDimensions.connectionPointHeight
            },
            save: false,
            focus: false,
        });
        connectionNodes.push(connectionNode);


        if (ioConnection.direction === "input") numInput++;
        else numOutput++;
    }

    canvas.createGroupNode({
        label: workflowNodesDimensions.groupLabel,
        pos: {
            x: tx-workflowNodesDimensions.padding,
            y: ty-workflowNodesDimensions.padding,
        },
        size: {
            width: workflowNodesDimensions.scriptWidth + 2*workflowNodesDimensions.padding,
            height: workflowNodesDimensions.padding + workflowNodesDimensions.scriptHeight + workflowNodesDimensions.padding + workflowNodesDimensions.connectionPointHeight * Math.max(numInput, numOutput) + workflowNodesDimensions.padding
        },
        save: false,
        focus: false,
    })
    canvas.requestSave();
}
