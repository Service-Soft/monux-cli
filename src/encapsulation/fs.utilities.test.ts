import { beforeEach, describe, expect, test } from '@jest/globals';

import { getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities } from './fs.utilities';
import { PathUtilities, Path } from './path.utilities';

const mockConstants: MockConstants = getMockConstants('fs-utilities');

describe('FsUtilities', () => {
    const filePath: Path = PathUtilities.resolve(mockConstants.PROJECT_DIR, 'app.ts');

    beforeEach(async () => {
        await FsUtilities.rm(mockConstants.PROJECT_DIR);
        await FsUtilities.createFile(filePath, ['export class App {', '    title = \'app\';', '}']);
    });

    test('replaceInFile replaces the first match', async () => {
        await FsUtilities.replaceInFile(filePath, 'App', 'AppComponent');
        expect(await FsUtilities.readFileLines(filePath)).toEqual(['export class AppComponent {', '    title = \'app\';', '}']);
    });

    test('replaceInFile fails when the file does not contain the text', async () => {
        await expect(FsUtilities.replaceInFile(filePath, 'export class AppComponent', ''))
            .rejects.toThrow(`Could not find export class AppComponent in ${filePath} to replace it`);
        expect(await FsUtilities.readFileLines(filePath)).toEqual(['export class App {', '    title = \'app\';', '}']);
    });

    test('replaceInFile fails when the text is only outside of the given lines', async () => {
        await expect(FsUtilities.replaceInFile(filePath, 'title', 'name', 2)).rejects.toThrow();
    });

    test('replaceAllInFile fails for a regular expression without a match, also when it is global', async () => {
        await expect(FsUtilities.replaceAllInFile(filePath, /signal\(/g, '')).rejects.toThrow();
        await FsUtilities.replaceAllInFile(filePath, /'app'/g, '\'shop\'');
        expect(await FsUtilities.readFileLines(filePath)).toEqual(['export class App {', '    title = \'shop\';', '}']);
    });

    test('findFilesRecursive finds the files of subdirectories, relative to the directory', async () => {
        await FsUtilities.createFile(PathUtilities.resolve(mockConstants.PROJECT_DIR, 'src', 'pages', 'home.ts'), '');
        expect(await FsUtilities.findFilesRecursive(mockConstants.PROJECT_DIR)).toEqual(['app.ts', 'src/pages/home.ts']);
    });
});