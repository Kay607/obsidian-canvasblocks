import { Notice, normalizePath } from "obsidian";
import { AllCanvasNodeData } from "obsidian/canvas";
import { CanvasLeaf, ExtendedCanvas } from "./canvasdefinitions";
import { canvasBlockSettingsLanguageName, languageToLanguageNameMap, scriptCodeBlockLanguageSuffix, workflowTrailingCode } from "./constants";
import CanvasBlocksPlugin, { CanvasBlockSetting, ExtendedDataAdapter, checkTextContainsLanguage, extractLanguageText, getNodeText } from "./main";
import { executePythonString } from "./pythonexecution";

export interface BaseMessage {
    command: string;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function defaultErrorHandler(canvas: ExtendedCanvas, error: string): void {
    new Notice('An error has occured while running this script. Check the console for more detail.');
	console.error('Error parsing Python script result:', error);
}

export async function defaultMessageHandler(canvas: ExtendedCanvas, message: BaseMessage)
{
    const commandType = message.command;
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
                const nodeFile = this.app.vault.getAbstractFileByPath(normalizePath(message.file));
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
                canvas.requestSave();
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
            break;
        
        case "NOTICE":
            {
                new Notice(message.text);
            }
            break;
    
        default:
            return message;
    }
    return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeScript(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, scriptData: AllCanvasNodeData, injectionData: any, scriptType: string, 
    // eslint-disable-next-line no-unused-vars
    messageCallback: (canvas: ExtendedCanvas, message: BaseMessage) =>  Promise<BaseMessage|null|undefined> = defaultMessageHandler, 
    // eslint-disable-next-line no-unused-vars
    errorCallback: (canvas: ExtendedCanvas, error: string) => void = defaultErrorHandler) 
{
    const allowedLanguages: (keyof typeof languageToLanguageNameMap)[] = ["python", "javascript"];

    const nodeText = await getNodeText(plugin.app, scriptData);
    if (nodeText === null) return;
    
    let chosenLanguage: string|null = null;
    for (const language of allowedLanguages) {
        const containsLanguage = checkTextContainsLanguage(nodeText, languageToLanguageNameMap[language]);

        if (containsLanguage){
            chosenLanguage = language;
            break;
        }
    }

    if(chosenLanguage === null) {
        new Notice(`This script doesn't contain any of the enabled languages`);
        return;
    }


    let scriptSettingsText = await extractLanguageText(plugin.app, nodeText, canvasBlockSettingsLanguageName);
    if (scriptSettingsText === null) return;
    let scriptSettings: CanvasBlockSetting = JSON.parse(scriptSettingsText);

    // Filter plugin.settings.variables by allowedVariables and create a map
    let filteredVariables: {[key: string]: string} = {};

    if (scriptSettings.allowedVariables !== undefined)
    {
        for (const variable of scriptSettings.allowedVariables) {
            // Check if the variable exists in plugin.settings.variables
            let found: boolean = false;

            for (const [key, value] of plugin.settings.variables) {
                if (key === variable) {
                    filteredVariables[variable] = value;
                    found = true;
                    break;
                }
            }

            if (!found) {
                new Notice(`Requested variable "${variable}" cannot be found from plugin settings`);
                return;
            }
        }
    }


    const adapter : ExtendedDataAdapter = plugin.app.vault.adapter;
    const fullInjectionData = {
        ...injectionData,
        execution_type: scriptType,
        vault_path: adapter.basePath,
        canvas_path: canvas.view.file.path,
        plugin_folder: plugin.getDataFolder(),
        injected_variables: filteredVariables

    };

    let scriptText = await extractLanguageText(plugin.app, nodeText, languageToLanguageNameMap[chosenLanguage] + scriptCodeBlockLanguageSuffix);
    if (scriptText === null) return;

    if (scriptType === "workflow")
        scriptText += workflowTrailingCode;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    const executionFunctions: Record<string, (plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, scriptText: string, fullInjectionData: any, messageCallback: any, errorCallback: any) => Promise<any>> = {
        python: executePythonString,
        //javascript: executeJavascriptString
    };


    const executeFunction = executionFunctions[chosenLanguage];
    if (executeFunction) {
        return await executeFunction(plugin, canvas, scriptText, fullInjectionData, messageCallback, errorCallback);
    }
}
