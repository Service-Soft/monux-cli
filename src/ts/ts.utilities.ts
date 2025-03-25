import { FileLine, FsUtilities, JsonUtilities } from '../encapsulation';
import { TsImportDefinition } from './ts-import-definition.model';

/**
 * The possible identifier strings for the start of an array.
 */
export type ArrayStartIdentifier = `${string}: [` | `${string} = [` | `${string}, [`;

/**
 * The possible identifier strings for the start of an object.
 */
export type ObjectStartIdentifier = `${string}: {` | `${string} = {` | `${string}, {`;

/**
 * The result of the getArrayStartingWith method.
 * Consists of the parsed array, as well as the old content string to use for replacement.
 */
type ParseArrayResult<T> = {
    /**
     * The parsed array.
     */
    result: T[],
    /**
     * The old content string.
     */
    contentString: string
};

/**
 * The result of the getObjectStartingWith method.
 * Consists of the parsed object, as well as the old content string to use for replacement.
 */
export type ParseObjectResult<T> = {
    /**
     * The parsed object.
     */
    result: T,
    /**
     * The old content string.
     */
    contentString: string
};

const constructorLineIdentifier: string = 'constructor(';

/**
 * Utilities for handling typescript files.
 */
export abstract class TsUtilities {

    /**
     * Adds the given content to the start of a class.
     * @param path - The path of the ts file with a class in it.
     * @param content - The content to add.
     */
    static async addToStartOfClass(path: string, content: string[]): Promise<void> {
        const lines: string[] = await FsUtilities.readFileLines(path);
        const classStart: FileLine = await FsUtilities.findLineWithContent(lines, 'class ');
        const classEnd: string | undefined = lines.find(l => l === '}' && lines.indexOf(l) >= classStart.index);
        if (classEnd == undefined) {
            throw new Error(`Could not find the end of the class "${classStart.content}"`);
        }
        await FsUtilities.replaceInFile(
            path,
            classStart.content,
            `${classStart.content}\n${content.join('\n')}`,
            classStart.index
        );
    }

    /**
     * Adds the given content to the end of a class.
     * @param path - The path of the ts file with a class in it.
     * @param content - The content to add.
     */
    static async addToEndOfClass(path: string, content: string[]): Promise<void> {
        const lines: string[] = await FsUtilities.readFileLines(path);
        const classStart: FileLine = await FsUtilities.findLineWithContent(lines, 'class ');
        const classEnd: string | undefined = lines.find(l => l === '}' && lines.indexOf(l) >= classStart.index);
        if (classEnd == undefined) {
            throw new Error(`Could not find the end of the class "${classStart.content}"`);
        }
        await FsUtilities.replaceInFile(path, classEnd, `${content.join('\n')}\n${classEnd}`, lines.indexOf(classEnd));
    }

    /**
     * Adds the given content to the body of the constructor.
     * @param path - The path of the file where the content should be added.
     * @param content - The content that should be added. Must include indentation already.
     */
    static async addToConstructorBody(path: string, content: string): Promise<void> {
        const lines: string[] = await FsUtilities.readFileLines(path);
        const superLine: string | undefined = lines.find(l => l.includes(' super('));
        const constructorLine: FileLine = await FsUtilities.findLineWithContent(lines, constructorLineIdentifier);
        if (superLine) {
            await FsUtilities.replaceInFile(
                path,
                superLine,
                `${superLine}\n        ${content}`
            );
            return;
        }
        if (constructorLine.content.endsWith(') {}')) {
            await FsUtilities.replaceInFile(
                path,
                constructorLine.content,
                `${constructorLine.content.slice(0, -1)}\n        ${content}\n    }`
            );
            return;
        }
        if (constructorLine.content.endsWith(') {')) {
            await FsUtilities.replaceInFile(
                path,
                constructorLine.content,
                `${constructorLine.content}\n        ${content}`
            );
            return;
        }
        if (constructorLine.content.endsWith('(')) {
            const line: FileLine = await FsUtilities.findLineWithContent(lines, ') {', constructorLine.index);
            await FsUtilities.replaceInFile(
                path,
                line.content,
                `${line.content}\n        ${content}`
            );
            return;
        }
        throw new Error('Unknown constructorLine');
    }

    /**
     * Adds the given content to the header of the constructor.
     * @param path - The path of the file where the content should be added.
     * @param content - The content that should be added. Must include indentation already.
     */
    static async addToConstructorHeader(path: string, content: string): Promise<void> {
        const lines: string[] = await FsUtilities.readFileLines(path);
        const constructorLine: FileLine = await FsUtilities.findLineWithContent(lines, constructorLineIdentifier);
        if (constructorLine.content.includes('constructor()')) {
            await FsUtilities.replaceInFile(path, 'constructor()', `constructor(${content})`);
            return;
        }
        if (constructorLine.content.includes(') {')) {
            await FsUtilities.replaceInFile(path, constructorLineIdentifier, `constructor(${content}, `);
            return;
        }
        await FsUtilities.replaceInFile(path, constructorLineIdentifier, `constructor(\n        ${content},`);
    }

    /**
     * Add the given content below the imports inside a ts file.
     * @param path - The path of the ts file to add the content to.
     * @param content - The content to add. Each entry is a line.
     */
    static async addBelowImports(path: string, content: string[]): Promise<void> {
        const lines: string[] = await FsUtilities.readFileLines(path);
        let replaceContent: string = '';
        for (let i: number = lines.length - 1; i >= 0; i--) {
            if (lines[i].startsWith('import ')) {
                replaceContent = lines[i];
            }
        }
        await FsUtilities.replaceInFile(path, replaceContent, `${replaceContent}\n\n${content.join('\n')}`);
    }

    /**
     * Reads an array from a file at the given path that starts with the provided startIdentifier.
     * @param filePath - The path of the file to read the array from.
     * @param startIdentifier - The identifier for the start of the array.
     * @returns The parsed array as well as the string in the file.
     */
    static async getArrayStartingWith<T>(filePath: string, startIdentifier: ArrayStartIdentifier): Promise<ParseArrayResult<T>> {
        const lines: string[] = await FsUtilities.readFileLines(filePath);
        const firstLine: FileLine = await FsUtilities.findLineWithContent(lines, startIdentifier);

        // Keep track of nested arrays
        let openBrackets: number = 0;
        let lastLineIndex: number = firstLine.index;

        // Iterate through lines starting from the first line
        for (let i: number = firstLine.index; i < lines.length; i++) {
            const line: string = lines[i];

            // Count array brackets
            openBrackets += (line.match(/\[/g) ?? []).length; // Opening brackets
            openBrackets -= (line.match(/]/g) ?? []).length; // Closing brackets

            // When all brackets are closed, we found the end of the array
            if (openBrackets === 0) {
                lastLineIndex = i;
                break;
            }
        }

        if (firstLine.index === lastLineIndex) {
            const content: string = firstLine.content.split(startIdentifier)[1].split(']')[0];
            return {
                result: await JsonUtilities.parseAsTs(`[${content}]`),
                contentString: ` [${content}${firstLine.content.endsWith('];') ? '];' : ']'}`
            };
        }

        const contentLines: FileLine[] = FsUtilities.getFileLines(lines, firstLine.index + 1, lastLineIndex - 1);
        const content: string = contentLines.map(l => l.content).join('\n');

        return {
            result: await JsonUtilities.parseAsTs(`[${content}]`),
            contentString: ` [\n${content}\n${lines[lastLineIndex]}`
        };
    }

    /**
     * Reads an object from a file at the given path that starts with the provided startIdentifier.
     * @param filePath - The path of the file to read the array from.
     * @param startIdentifier - The identifier for the start of the object.
     * @returns The parsed object as well as the string in the file.
     */
    static async getObjectStartingWith<T>(filePath: string, startIdentifier: ObjectStartIdentifier): Promise<ParseObjectResult<T>> {
        const lines: string[] = await FsUtilities.readFileLines(filePath);
        const firstLine: FileLine = await FsUtilities.findLineWithContent(lines, startIdentifier);

        let openBraces: number = 0;
        let lastLineIndex: number = firstLine.index;

        for (let i: number = firstLine.index; i < lines.length; i++) {
            const line: string = lines[i];

            openBraces += (line.match(/{/g) ?? []).length;
            openBraces -= (line.match(/}/g) ?? []).length;

            if (openBraces === 0) {
                lastLineIndex = i;
                break;
            }
        }

        if (firstLine.index === lastLineIndex) {
            const content: string = firstLine.content.split(startIdentifier)[1].split('}')[0];
            return {
                result: await JsonUtilities.parseAsTs(`{${content}}`),
                contentString: ` {${content}${firstLine.content.trim().endsWith('};') ? '};' : '}'}`
            };
        }

        const contentLines: FileLine[] = FsUtilities.getFileLines(lines, firstLine.index + 1, lastLineIndex - 1);
        const content: string = contentLines.map(l => l.content).join('\n');

        return {
            result: await JsonUtilities.parseAsTs(`{${content}}`),
            contentString: ` {\n${content}\n${lines[lastLineIndex]}`
        };
    }

    /**
     * Adds the given imports to the file at the given path.
     * @param path - The path of the ts file to add the imports to.
     * @param imports - The imports to add.
     */
    static async addImportStatements(path: string, imports: TsImportDefinition[]): Promise<void> {
        for (const imp of imports) {
            let lines: string[] = await FsUtilities.readFileLines(path);
            lines = this.addImportStatement(lines, imp);
            await FsUtilities.updateFile(path, lines, 'replace');
        }
    }

    private static addImportStatement(lines: string[], imp: TsImportDefinition): string[] {
        // check if an import from the path already exists
        const existingImport: string | undefined = lines.find(l => l.includes('import ') && l.includes(imp.path));
        if (!existingImport) {
            return [this.getNewImportStatement(imp), ...lines];
        }
        lines[lines.indexOf(existingImport)] = this.getUpdatedImportStatement(existingImport, imp);
        return lines;
    }

    private static getNewImportStatement(imp: TsImportDefinition): string {
        return imp.defaultImport
            ? `import ${imp.element} from \'${imp.path}\';`
            : `import { ${imp.element} } from \'${imp.path}\';`;
    }

    private static getUpdatedImportStatement(existingImport: string, imp: TsImportDefinition): string {
        if (imp.defaultImport && !existingImport.includes('{')) {
            throw new Error(`There is already a default import from ${imp.path}`);
        }
        if (imp.defaultImport) {
            return existingImport.replace('{', `${imp.element}, {`);
        }
        if (existingImport.includes('{')) {
            return existingImport.replace('import {', `import { ${imp.element},`);
        }
        return existingImport.replace('import ', `import { ${imp.element} }, `);
    }
}