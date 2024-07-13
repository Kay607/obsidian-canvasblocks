// eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
export function injectFunction(object: any, functionName: string, targetObject: any, replacementFunction: (originalFunction: (...args: any[]) => any, ...args: any[]) => any): void {
    const functionPath = functionName.split('.');
    const originalFunctionName = `original_${functionPath.join('_')}`;
    
    let context = object;
    for (let i = 0; i < functionPath.length - 1; i++) {
        context = context[functionPath[i]];
        if (!context) {
            throw new Error(`Property path ${functionName} does not exist on the object.`);
        }
    }

    const finalFunctionName = functionPath[functionPath.length - 1];

    if (targetObject[originalFunctionName]) {
        context[finalFunctionName] = targetObject[originalFunctionName];
    } else {
        targetObject[originalFunctionName] = context[finalFunctionName];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function toInject(...args: any[]) {
        if (!targetObject[originalFunctionName]) return;

        replacementFunction(targetObject[originalFunctionName].bind(context), ...args);
    }

    context[finalFunctionName] = toInject;
}