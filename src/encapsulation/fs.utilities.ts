import { Dirent } from 'fs';
import { access, writeFile, mkdir, readFile, readdir, rm, rename, cp } from 'fs/promises';
import path, { dirname } from 'path';

import { JsonUtilities } from './json.utilities';

/**
 * Definition for a line in a file.
 * Contains its index, as well as its content.
 */
export type FileLine = {
    /**
     * The index of the line inside the file lines.
     */
    index: number,
    /**
     * The content of the line.
     */
    content: string
};

/**
 * Encapsulates functionality of the fs package.
 */
export abstract class FsUtilities {

    /**
     * Gets file lines between the provided indices.
     * @param lines - The string lines to build the FileLine[] from.
     * @param fromIndex - From which index to start.
     * @param untilIndex - Until which index to build.
     * @returns An array of FileLine.
     */
    static getFileLines(lines: string[], fromIndex: number, untilIndex: number): FileLine[] {
        const allLines: FileLine[] = [];
        for (let i: number = 0; i < lines.length; i++) {
            allLines.push({ content: lines[i], index: i });
        }
        return allLines.filter(l => l.index >= fromIndex && l.index <= untilIndex);
    }

    /**
     * Tries to find a line inside the provided lines which contains the given content.
     * You can optionally filter to only search in a specified line range.
     * @param lines - The lines to search in.
     * @param content - The content to search for.
     * @param fromIndex - At which line the search should start. Defaults to 0,.
     * @param untilIndex - At which line the search should end. Defaults to the end of the array.
     * @returns The found line.
     * @throws When no line could be found.
     */
    static findLineWithContent(
        lines: string[],
        content: string,
        fromIndex: number = 0,
        untilIndex: number = lines.length - 1
    ): FileLine {
        let line: FileLine = { index: fromIndex, content: lines[fromIndex] };
        while (!line.content.includes(content)) {
            const i: number = line.index + 1;
            if (i > untilIndex) {
                throw new Error(`Could not find line with content ${content} in the lines ${fromIndex}-${untilIndex}`);
            }
            line = { index: i, content: lines[i] };
        }
        return line;
    }

    /**
     * Checks if a file at the given path exists.
     * @param path - The path to check.
     * @returns True when a file could be accessed and false otherwise.
     */
    static async exists(path: string): Promise<boolean> {
        try {
            await access(path);
            return true;
        }
        catch {
            return false;
        }
    }

    /**
     * Renames "from" to "to".
     * @param from - The old path.
     * @param to - The new path.
     */
    static async rename(from: string, to: string): Promise<void> {
        await rename(from, to);
    }

    /**
     * Replace all instances of oldContent in the file at the given path with newContent.
     * @param path - The path of the file.
     * @param oldContent - The old content that should be replaced.
     * @param newContent - The new content that should replace the old one.
     * @param fromIndex - The starting line index (inclusive). Defaults to the start of the file.
     * @param untilIndex - The ending line index (inclusive). Defaults to the end of the file.
     */
    static async replaceAllInFile(
        path: string,
        oldContent: string | RegExp,
        newContent: string,
        fromIndex?: number,
        untilIndex?: number
    ): Promise<void> {
        await this.replaceContentInFile(path, oldContent, newContent, true, fromIndex, untilIndex);
    }

    /**
     * Replace all instances of oldContent in the file at the given path with newContent.
     * @param path - The path of the file.
     * @param oldContent - The old content that should be replaced.
     * @param newContent - The new content that should replace the old one.
     * @param fromIndex - The starting line index (inclusive). Defaults to the start of the file.
     * @param untilIndex - The ending line index (inclusive). Defaults to the end of the file.
     */
    static async replaceInFile(
        path: string,
        oldContent: string | RegExp,
        newContent: string,
        fromIndex?: number,
        untilIndex?: number
    ): Promise<void> {
        await this.replaceContentInFile(path, oldContent, newContent, false, fromIndex, untilIndex);
    }

    private static async replaceContentInFile(
        path: string,
        oldContent: string | RegExp,
        newContent: string,
        all: boolean,
        fromIndex?: number,
        untilIndex?: number
    ): Promise<void> {
        let content: string = await this.readFile(path);
        const lines: string[] = content.split('\n');

        // Normalize indexes
        const start: number = fromIndex ?? 0;
        const end: number = untilIndex !== undefined ? untilIndex + 1 : lines.length;
        const beforeLines: string[] = lines.slice(0, start);
        const afterLines: string[] = lines.slice(end);

        const stringToModify: string = lines.slice(start, end).join('\n');
        const modifiedLines: string = stringToModify[all ? 'replaceAll' : 'replace'](oldContent, newContent);

        content = [...beforeLines, ...modifiedLines.split('\n'), ...afterLines].join('\n');
        await this.updateFile(path, content, 'replace');
    }

    /**
     * Creates a file at the given path.
     * @param path - The path of the new file to create.
     * @param data - The data to write into the file. Can be a raw data string or an array of lines, which are joined by \n.
     * @param recursive - Whether or not to recursively create the file.
     * @param log - Whether or not the success of the creation should be logged to the console.
     */
    static async createFile(path: string, data: string | string[], recursive: boolean = true, log: boolean = true): Promise<void> {
        if (await this.exists(path)) {
            throw new Error(`File at ${path} already exists. Did you mean to call "updateFile"?`);
        }
        data = this.normalizeData(data);
        const parentDir: string = dirname(path);
        if (recursive && !await this.exists(parentDir)) {
            await this.mkdir(parentDir, true, false);
        }
        await writeFile(path, data);
        if (log) {
            // eslint-disable-next-line no-console
            console.log('created', path);
        }
    }

    private static normalizeData(data: string | string[]): string {
        if (Array.isArray(data)) {
            data = data.join('\n');
        }
        data = data.replaceAll('\t', '    ');
        return data.endsWith('\n') ? data.slice(0, -1) : data;
    }

    /**
     * Updates the file at the given path with the given data.
     * Can either replace, prepend or append.
     * @param path - The path of the new file to create.
     * @param data - The data to write into the file. Can be a raw data string or an array of lines, which are joined by \n.
     * @param action - Whether the data should replace the current content or be pre-/appended.
     * @param log - Whether or not the success of the update should be logged to the console.
     */
    static async updateFile(
        path: string,
        data: string | string[],
        action: 'replace' | 'prepend' | 'append',
        log: boolean = true
    ): Promise<void> {
        if (!await this.exists(path)) {
            throw new Error(`File at ${path} does not exist. Did you mean to call "createFile"?`);
        }

        data = this.normalizeData(data);
        switch (action) {
            case 'replace': {
                await writeFile(path, data);
                break;
            }
            case 'append': {
                let currentContent: string[] = await this.readFileLines(path);
                currentContent = currentContent[0].length ? [...currentContent, data] : [data];
                await writeFile(path, this.normalizeData(currentContent));
                break;
            }
            case 'prepend': {
                let currentContent: string[] = await this.readFileLines(path);
                currentContent = currentContent[0].length ? [data, ...currentContent] : [data];
                await writeFile(path, this.normalizeData(currentContent));
                break;
            }
        }
        if (log) {
            // eslint-disable-next-line no-console
            console.log('updated', path);
        }
    }

    /**
     * Reads the file content at the given path.
     * Expects utf-8.
     * @param path - The path of the file to read.
     * @returns The content as a single string.
     */
    static async readFile(path: string): Promise<string> {
        return readFile(path, { encoding: 'utf8' });
    }

    /**
     * Same as readFile, but returns the content as an array of lines instead.
     * @param path - The path of the file to read the lines from.
     * @returns The content as an array of line strings.
     */
    static async readFileLines(path: string): Promise<string[]> {
        const content: string = await this.readFile(path);
        return content.split('\n');
    }

    /**
     * Parses the file at the given path using JsonUtilities.
     * @param filePath - The path of the file to parse.
     * @returns An object of the provided generic.
     */
    static async parseFileAs<T>(filePath: string): Promise<T> {
        const fileContent: string = await this.readFile(filePath);
        return JsonUtilities.parse(fileContent);
    }

    /**
     * Removes either a file or directory.
     * @param path - The path to remove.
     * @param recursive - Whether or not subdirectories should be deleted as well. Defaults to true.
     */
    static async rm(path: string, recursive: boolean = true): Promise<void> {
        if (!await this.exists(path)) {
            return;
        }
        await rm(path, { recursive: recursive, force: true });
    }

    /**
     * Creates a directory at the given path.
     * @param path - The path of the directory to create.
     * @param recursive - Whether or not missing directories in the path should be created as well.
     * @param log - Whether or not the success of the creation should be logged to the console.
     */
    static async mkdir(path: string, recursive: boolean = true, log: boolean = true): Promise<void> {
        await mkdir(path, { recursive: recursive });
        if (log) {
            // eslint-disable-next-line no-console
            console.log('created', path);
        }
    }

    /**
     * Gets the root level subdirectories and files of the directory at the provided path.
     * @param path - The path of the directory to get the contents of.
     * @returns An array of the directory contents.
     */
    static async readdir(path: string): Promise<Dirent[]> {
        return readdir(path, { withFileTypes: true });
    }

    /**
     * Moves the contents of the given source inside the given destination.
     * Overrides any contents that might already exist inside the destination.
     * @param source - The source to move the content of.
     * @param destination - The destination folder where the content should be moved inside.
     * @param excludeElements - Optional array of elements which should not be moved.
     */
    static async moveDirectoryContent(source: string, destination: string, excludeElements: string[] = []): Promise<void> {
        const entries: Dirent[] = (await this.readdir(source)).filter(e => !excludeElements.includes(e.name));
        await Promise.all(entries.map(e => this.copyEntry(e, destination)));
        await this.rm(source);
    }

    private static async copyEntry(entry: Dirent, destination: string): Promise<void> {
        const source: string = path.join(entry.parentPath, entry.name);
        const dest: string = path.join(destination, entry.name);
        await cp(source, dest, { recursive: true, errorOnExist: true });
    }
}