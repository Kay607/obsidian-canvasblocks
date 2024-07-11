import { AllCanvasNodeData } from "obsidian/canvas";
import { ExtendedCanvas, ExtendedNode } from "./canvasdefinitions";
import CanvasBlocksPlugin, { canvasClosestNodeToPositionInBounds, checkContainsLanguage, checkContainsScript } from "./main";
import { Notice } from "obsidian";
import { executeScript } from "./scriptexecution";

export async function handleSimpleScript(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, selectedID: string, selectedNode: ExtendedNode) {
    
    const otherID : string|null = await canvasClosestNodeToPositionInBounds(canvas, selectedNode.bbox, 
        (node: AllCanvasNodeData) => { return node.id === selectedID });

    // If selected and other are both scripts, use selected as the script
    // If neither are scripts, return
    // Otherwise, use the valid script as a script
    const selectedData = plugin.getNodeByID(canvas, selectedID);
    if (selectedData === undefined) return;

    const selectedIsValidScript = await checkContainsScript(plugin.app, selectedData);

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
        const otherData = plugin.getNodeByID(canvas, otherID);

        if (otherData === undefined) return;

        const otherIsValidScript = await checkContainsScript(plugin.app, otherData);
        if (!otherIsValidScript) {
            new Notice('No valid scripts are selected');
            return;
        }
        
        scriptID = otherID;
        parameterID = selectedID;
    }


    let parameterData: AllCanvasNodeData|{}|undefined = {};
    if (parameterID !== null)
        parameterData = plugin.getNodeByID(canvas, parameterID);
    const scriptData = plugin.getNodeByID(canvas, scriptID);

    if (scriptData === undefined || parameterData === undefined) return;

    // Finds all edges that point into the script node
    const arrowParamterEdges = canvas.data.edges.filter(edge => edge.toNode === scriptID);

    // Gets the IDs of nodes pointing to the script node
    const arrowParameterIDs = arrowParamterEdges.map(edge => edge.fromNode);

    // Finds the nodes from the IDs
    const arrowParameters = canvas.data.nodes.filter((node) => arrowParameterIDs.includes(node.id));

    const injectionData = {
        parameter_data: parameterData,
        script_data: scriptData,
        arrow_parameters: arrowParameters,
        has_parameter: parameterID !== null
    };

    executeScript(plugin, canvas, scriptData, injectionData, "simple");
}
