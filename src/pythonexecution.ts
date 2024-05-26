import CanvasBlocksPlugin from './main';
import { CanvasLeaf, ExtendedCanvas } from './canvasdefinitions';

import * as fs from 'fs';
import { tmpdir } from "os";
import { sep } from "path";

import { PythonShell } from 'python-shell';

// @ts-ignore
import canvasblocks_python_lib from '../resources/canvasblocks-python-lib.py';
import { Notice, normalizePath } from 'obsidian';

export function defaultErrorHandler(canvas: ExtendedCanvas, error: string): void {
    new Notice('An error has occured while running this script. Check the console for more detail.');
	console.error('Error parsing Python script result:', error);
}

export async function defaultMessageHandler(canvas: ExtendedCanvas, message: any)
{
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
                let nodeFile = this.app.vault.getAbstractFileByPath(normalizePath(message.file));
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

export async function executePythonString(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, scriptCode: string, injectionData: object, messageCallback: (canvas: ExtendedCanvas, message: any) => any = defaultMessageHandler, errorCallback: (canvas: ExtendedCanvas, error: string) => void = defaultErrorHandler) {
    return new Promise<boolean>((resolve, reject) => {
        const pythonScript = `
${canvasblocks_python_lib}
${scriptCode.replace(/[^\x20-\x7E\t\n]/g, '')}
        `;

        let pythonPath: string|undefined;
        if (plugin.settings.pythonPath.trim() !== "")
            pythonPath = plugin.settings.pythonPath;

        const randomInt = Math.floor(Math.random() * 10000000000);
        const tempFile = tmpdir() + sep + `pythonShellFile${randomInt}.py`
        fs.writeFileSync(tempFile, pythonScript);

        let pyshell = new PythonShell(tempFile, {mode: 'json', pythonPath: pythonPath});
        pyshell.send(injectionData);

        // Listen for 'error' and 'stderr' events to catch any errors
        let errorMessage = "";
        pyshell.on('error', (error) => {
            errorMessage += error + '\n';
        });

        pyshell.on('stderr', (data) => {
            errorMessage += data.toString() + '\n';
        });


        let messageQueue: any[] = [];
        pyshell.on('message', (message) => {
            messageQueue.push(message);
        });

        pyshell.on('close', async () => {
            if(errorMessage.length > 0)
            {
                await errorCallback(canvas, errorMessage);
                resolve(false);
            }

            for (let message of messageQueue) {
                await messageCallback(canvas, message);
            }
            resolve(true);
        });
    });
}