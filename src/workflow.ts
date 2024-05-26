import CanvasBlocksPlugin, { boundingBoxFromNode, canvasClosestNodeToPositionInBounds, checkContainsLanguage, pythonCodeBlockLanguageName, canvasBlockSettingsLanguageName, canvasBlockConnectionPointLanguageName, extractLanguageText, ConnectionPointData, CanvasBlockSetting, IOConnection, ExtendedDataAdapter, getNodeText } from "./main";
import { CanvasView, ExtendedCanvas } from "./canvasdefinitions";
import { defaultMessageHandler, executePythonString } from "./pythonexecution";

import { TFile, ItemView, Notice, TAbstractFile, Vault } from "obsidian";
import { AllCanvasNodeData, CanvasGroupData, CanvasEdgeData, CanvasFileData, CanvasTextData } from "obsidian/canvas";

export function refreshNode(canvas: ExtendedCanvas, id: string)
{
    let node = canvas.nodes.get(id);
    if(node === undefined) return;
    
    let text = node.text;
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
            } catch (error) {}
        }, 0);
    }
    

    waitForRenderQueue(); // Start waiting for the render queue to be null
}

export async function handleWorkflowFromGroup(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, selectedData: CanvasGroupData) { 
    let nodes = canvas.data.nodes;  

    let closestID = await canvasClosestNodeToPositionInBounds(canvas, boundingBoxFromNode(selectedData), 
        async (node: AllCanvasNodeData) => { 
            if(node.id === selectedData.id) return true;
            const hasCode = await checkContainsLanguage(plugin.app, node, pythonCodeBlockLanguageName);
            if (!hasCode) return true;

            const hasSettings = await checkContainsLanguage(plugin.app, node, canvasBlockSettingsLanguageName);
            if (!hasSettings) return true;
            return false;
        });

    if (closestID === null) return;

    let startScriptNode: AllCanvasNodeData|undefined = nodes.find(node => node.id === closestID);
    if (startScriptNode === undefined) return;

    executeWorkflow(plugin, canvas, startScriptNode);
}

async function executeWorkflow(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, startScriptNode: AllCanvasNodeData)
{
    let nodes: AllCanvasNodeData[] = canvas.data.nodes;
    let edges: CanvasEdgeData[] = canvas.data.edges;

    let scriptConnectionPoints: { [key: string]: AllCanvasNodeData[] } = {};

    // Key is the to side, value is the from side
    let dataFlow: { [key: string]: string } = {};

    // The key is the value from dataFlow, the value is json data
    let executionData: { [key: string]: string } = {};

    for (const node of nodes)
    {
        let text = await extractLanguageText(plugin.app, node, canvasBlockConnectionPointLanguageName);
        if (text === null) continue;
        let connectionPointData: ConnectionPointData = JSON.parse(text);

        if (!scriptConnectionPoints[connectionPointData.scriptID]) {
            scriptConnectionPoints[connectionPointData.scriptID] = [];
        }
        scriptConnectionPoints[connectionPointData.scriptID].push(node);
    }


    let executeStack: AllCanvasNodeData[] = [];
    let searchQueue: AllCanvasNodeData[] = [startScriptNode];

    // Creates a list of scripts which need to be executed in order
    while (searchQueue.length > 0)
    {
        // Get the next script to trace the connections of
        let currentScript = searchQueue.shift();
        if(currentScript === undefined) continue;

        // Add the current script as the next script to be executed
        if (!executeStack.includes(currentScript)) {
            executeStack.push(currentScript);
        }

        // Get the settings (inputs and outputs) of the current script
        let settingsLanguageBlock = await extractLanguageText(plugin.app, currentScript, canvasBlockSettingsLanguageName);
        if(settingsLanguageBlock === null) continue;
        let scriptSettings: CanvasBlockSetting = JSON.parse(settingsLanguageBlock);

        // Get an array of connection nodes for the script
        let connectionPoints = scriptConnectionPoints[currentScript.id];
        for (const connectionPoint of connectionPoints)
        {
            // Get the connection point information (script and input/output information)
            let connectionPointLanguageBlock = await extractLanguageText(plugin.app, connectionPoint, canvasBlockConnectionPointLanguageName);
            if(connectionPointLanguageBlock === null) continue;
			let connectionPointData: ConnectionPointData = JSON.parse(connectionPointLanguageBlock);

            // Get the relevant information from the script about this connection
            let ioConnection = scriptSettings.ioConnections[connectionPointData.name];
            if(ioConnection === undefined) continue;

            // Ignore all output connnections as only the inputs are needed to trace back the path of scripts
            if(ioConnection.direction === "output") continue;

            // Get the edges that connect the input connection node to the data / output connection node of another script
            let connectionEdge = edges.find(edge => edge.toNode === connectionPoint.id);
            if(connectionEdge === undefined) continue;

            let otherConnectionID = connectionEdge.fromNode;
            if(otherConnectionID === undefined) continue;
            
            // Get the node attached to this edge
            let otherConnectionPoint = nodes.find(node => node.id === otherConnectionID);
            if(otherConnectionPoint === undefined) continue;

            // Try to get the connection data
            let otherConnectionPointLanguageBlock = await extractLanguageText(plugin.app, otherConnectionPoint, canvasBlockConnectionPointLanguageName);
            
            // If it is not a connection, process the node as a file/text node
            if(otherConnectionPointLanguageBlock === null)
            {
                // Immediately add the node data as there is no script to process first
                let flowName = `${otherConnectionID}_NODE}`;
                dataFlow[`${currentScript.id}_${connectionPointData.name}`] = flowName

                switch (ioConnection.type) {
                    case "text":
                    case "integer":
                    case "float":
                        let text: string|null = await getNodeText(plugin.app, otherConnectionPoint);
                        if (text === null)
                        {
                            new Notice(`Failed to load node as text`);
                            return;
                        }
                        executionData[flowName] = text;
                        break;


                    case "image":
                        if (otherConnectionPoint.type !== "file"){
                            new Notice("Attempted to load a non-image node (${otherConnectionPoint.file}) as an image");
                            return;
                        }

                        let file: TAbstractFile|null = plugin.app.vault.getAbstractFileByPath(otherConnectionPoint.file);
                        if (file === null || !(file instanceof TFile)) {
                            new Notice(`Attempt to load image ${otherConnectionPoint.file} failed`);
                            return;
                        };

                        let image = await plugin.app.vault.readBinary(file);
                        let base64Image = Buffer.from(image).toString('base64');
                        executionData[flowName] = base64Image;

                        break;

                    case "file":
                    case "any":
                    default:
                        executionData[flowName] = JSON.stringify(otherConnectionPoint);
                        break;
                }

                continue;
            }

			let otherConnectionPointData: ConnectionPointData = JSON.parse(otherConnectionPointLanguageBlock);


            let otherScript = nodes.find(node => node.id === otherConnectionPointData.scriptID);
            if(otherScript === undefined) continue;

            if (!searchQueue.includes(otherScript)) {
                searchQueue.push(otherScript);
            }

            dataFlow[`${currentScript.id}_${connectionPointData.name}`] = `${otherScript.id}_${otherConnectionPointData.name}`;
        }
    }

    while(executeStack.length > 0)
    {
        let currentScript = executeStack.pop();
        if(currentScript === undefined) continue;

        let sucess = await executeScript(plugin, canvas, currentScript, dataFlow, executionData);
        if(!sucess) {
            new Notice("Workflow execution stopped because a script failed");
            break;
        };

    }
}


async function executeScript(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, scriptNode: AllCanvasNodeData, dataFlow: { [key: string]: string }, executionData: { [key: string]: string }): Promise<boolean>
{
    let scriptLanguageBlock = await extractLanguageText(plugin.app, scriptNode, pythonCodeBlockLanguageName);
    if(scriptLanguageBlock === null) return false;

    let settingsLanguageBlock = await extractLanguageText(plugin.app, scriptNode, canvasBlockSettingsLanguageName);
    if(settingsLanguageBlock === null) return false;

    let scriptSettings: CanvasBlockSetting = JSON.parse(settingsLanguageBlock);

    let inputData: { [key: string]: string } = {};
    let outputData: { [key: string]: any } = {};

    for (const connectionName in scriptSettings.ioConnections)
    {
        let ioConnection: IOConnection = scriptSettings.ioConnections[connectionName];
        if (ioConnection.direction === "output") 
        {
            outputData[connectionName] = null;
            continue;
        }

        let flow = dataFlow[`${scriptNode.id}_${connectionName}`];
        let data = executionData[flow];

        inputData[connectionName] = data
    }

    let adapter : ExtendedDataAdapter = plugin.app.vault.adapter;
    let injectionData = {
        execution_type: 'workflow',
        in_data: inputData,
        out_data: outputData,
        script_settings: scriptSettings,
        script_data: scriptNode,
        vault_path: adapter.basePath,
        plugin_folder: plugin.getDataFolder(),
    };

    let messageHandler = async (canvas: ExtendedCanvas, message: any) => {
        let response = await defaultMessageHandler(canvas, message)
        if(response === null) return;

        let commandType = message.command;
        if(commandType === "RETURN_OUTPUT")
        {
            let outData = message.data;
            for (const key in outData) {
                if (outData.hasOwnProperty(key)) {
                    executionData[`${scriptNode.id}_${key}`] = outData[key];
                }
            }
        }
    }

    let sucess = await executePythonString(plugin, canvas, scriptLanguageBlock + "\n\n#Generated by plugin\n_return_output_data()", injectionData, messageHandler)
    return sucess;
}


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function addWorkflowScript(plugin: CanvasBlocksPlugin, scriptFile: TFile) {
	let view: CanvasView | null = this.app.workspace.getActiveViewOfType(ItemView);
	if (view === null) return;
	if (!view.hasOwnProperty('canvas')) {
		new Notice("A canvas must be open to run this command");
		return;
	}

	let canvas: ExtendedCanvas = view.canvas;
	let scriptText: string = await app.vault.read(scriptFile);

    let text = await extractLanguageText(plugin.app, scriptText, canvasBlockSettingsLanguageName);
    if (text === null) return;
    let scriptSettings: CanvasBlockSetting = JSON.parse(text);

    let padding = 20;
    let scriptWidth = 400;
    let scriptHeight = 60;
    let connectionPointWidth = 180;
    let connectionPointHeight = 50;

    let tx = canvas.tx;
    let ty = canvas.ty;

    let scriptNode: CanvasFileData = canvas.createFileNode({
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

    let connectionNodes: CanvasTextData[] = [];
    for (const connectionName in scriptSettings.ioConnections)
    {
        let ioConnection: IOConnection = scriptSettings.ioConnections[connectionName];

        let numberOfConnectionsAbove: number = ioConnection.direction === "input" ? numInput : numOutput;
        let offset: number = ioConnection.direction === "input" ? 0 : scriptWidth - connectionPointWidth;

        let connectionNode = canvas.createTextNode({
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
