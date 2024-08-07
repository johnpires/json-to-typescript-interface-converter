import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.convertJsonToInterface', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a JSON file first to convert.');
            return;
        }

        const document = editor.document;
        const json = document.getText();
        const fileName = path.basename(document.fileName, '.json');
        const rootInterfaceName = toPascalCase(fileName);

        function toPascalCase(str: string): string {
            return str.replace(/(^\w|[-_]\w)/g, (group) => group.replace(/[-_]/, '').toUpperCase());
        }

        try {
            const jsonObject = JSON.parse(json);
            const interfaces = jsonToInterfaces(jsonObject, rootInterfaceName);
            const interfaceText = interfaces.join('\n\n');
            const newDocument = await vscode.workspace.openTextDocument({
                content: interfaceText,
                language: 'typescript'
            });
            vscode.window.showTextDocument(newDocument);
        } catch (error) {
            vscode.window.showErrorMessage('Invalid JSON file.');
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

function jsonToInterfaces(json: any, rootName: string): string[] {
    const interfaces: string[] = [];
    const processedObjects = new Map<string, string>();

    function processObject(obj: any, name: string) {
        if (processedObjects.has(name)) return;

        let result = `interface ${name} {\n`;
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const camelCaseKey = toCamelCase(key);
                result += `  ${camelCaseKey}: ${getType(value, capitalizeFirstLetter(camelCaseKey))};\n`;
            }
        }
        result += `}\n`;
        interfaces.push(result);
        processedObjects.set(name, result);
    }

    function getType(value: any, key: string): string {
        if (Array.isArray(value)) {
            if (value.length > 0) {
                return `${getType(value[0], key)}[]`;
            } else {
                return 'any[]';
            }
        } else if (value === null) {
            return 'any';
        } else if (typeof value === 'object') {
            const interfaceName = capitalizeFirstLetter(key);
            processObject(value, interfaceName);
            return interfaceName;
        } else {
            return typeof value;
        }
    }

    function capitalizeFirstLetter(string: string): string {
        return string.charAt(0).toUpperCase() + string.slice(1).replace(/-/g, '');
    }

    function toCamelCase(str: string): string {
        return str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
    }

    function toPascalCase(str: string): string {
        return str.replace(/(^\w|[-_]\w)/g, (group) => group.replace(/[-_]/, '').toUpperCase());
    }

    processObject(json, rootName);
    return interfaces;
}
