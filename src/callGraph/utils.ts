import * as fs from 'fs/promises';


export function extractFileType(name: string): string {
    const parts = name.split(".");
    return parts.length > 1 ? `.${parts.pop()}` : "";
}


export async function readFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
}

export async function writeFile(filePath: string, content: string) {
    await fs.writeFile(
        filePath,
        content,
        'utf-8'
    );
}

