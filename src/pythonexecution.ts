import CanvasBlocksPlugin from './main';
import { ExtendedCanvas } from './canvasdefinitions';
import { BaseMessage, defaultMessageHandler, defaultErrorHandler } from './scriptexecution';

import * as fs from 'fs';
import { tmpdir } from "os";
import { sep } from "path";

import { PythonShell } from 'python-shell';

// @ts-ignore
import canvasblocks_python_lib from '../resources/canvasblocks-python-lib.py';

export async function executePythonString(plugin: CanvasBlocksPlugin, canvas: ExtendedCanvas, scriptCode: string, injectionData: object, 
    // eslint-disable-next-line no-unused-vars
    messageCallback: (canvas: ExtendedCanvas, message: BaseMessage) =>  Promise<BaseMessage|null|undefined> = defaultMessageHandler, 
    // eslint-disable-next-line no-unused-vars
    errorCallback: (canvas: ExtendedCanvas, error: string) => void = defaultErrorHandler) 
{
    return new Promise<boolean>((resolve) => {
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

        const pyshell = new PythonShell(tempFile, {mode: 'json', encoding: 'utf-8', pythonPath: pythonPath});
        pyshell.send(injectionData);

        // Listen for 'error' and 'stderr' events to catch any errors
        let errorMessage = "";
        pyshell.on('error', (error) => {
            errorMessage += error + '\n';
        });

        pyshell.on('stderr', (data) => {
            errorMessage += data.toString() + '\n';
        });


        const messageQueue: BaseMessage[] = [];
        pyshell.on('message', (message) => {
            messageQueue.push(message);
        });

        pyshell.on('close', async () => {
            if(errorMessage.length > 0)
            {
                await errorCallback(canvas, errorMessage);
                resolve(false);
            }

            for (const message of messageQueue) {
                await messageCallback(canvas, message);
            }
            resolve(true);
        });
    });
}