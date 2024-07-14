import { AllCanvasNodeData } from "obsidian/canvas";
import { ExtendedCanvas, ExtendedNode } from "./canvasdefinitions";
import CanvasBlocksPlugin, { canvasClosestNodeToPositionInBounds, checkContainsScript, checkTextContainsLanguage, getNodeText } from "./main";
import { Notice } from "obsidian";
import { executeScript } from "./scriptexecution";
import { canvasBlockSettingsLanguageName } from "./constants";

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


    // Add the canvasblocksettings block if it doesn't exist
    const processScriptData = plugin.getNodeByID(canvas, scriptID);
    if(processScriptData === undefined) return;
    const processScriptText = await getNodeText(plugin.app, processScriptData);
    if(processScriptText === null) return;

    if(!await checkTextContainsLanguage(processScriptText, canvasBlockSettingsLanguageName)) {

        const settingsData = {
            type: "simple"
        };

        const mergeData = "```" + canvasBlockSettingsLanguageName + "\n" + JSON.stringify(settingsData, null, "\t") + "\n" + "```";

        // get position of first instance of "```"
        const position = processScriptText.indexOf("```");

        const newText = processScriptText.slice(0, position) + "\n" + mergeData + "\n" + processScriptText.slice(position);


        if (processScriptData.type === "text")
        {
            canvas.nodes.get(processScriptData.id).setText(newText);
            canvas.data.nodes.filter(node => node.id === processScriptData.id)[0].text = newText;
            canvas.requestSave();
        }
        else if (processScriptData.type === "file")
        {
            const file = plugin.app.vault.getFileByPath(processScriptData.file);
            if (file === null) return;
            plugin.app.vault.modify(file, newText);
        }
        new Notice('WARNING: Settings not added to script. This has been automatically fixed (Simple script)', 10000);
    }


    let parameterData: AllCanvasNodeData|Record<string, unknown>|undefined = {};
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
