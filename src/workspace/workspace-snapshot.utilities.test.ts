import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities, Path, PathUtilities } from '../encapsulation';
import { WorkspaceSnapshot, WorkspaceSnapshotUtilities } from './workspace-snapshot.utilities';

const mockConstants: MockConstants = getMockConstants('workspace-snapshot-utilities');

/**
 * Reads every file of the workspace but what npm installed, by its path.
 * @returns The files and their content.
 */
async function readWorkspace(): Promise<Record<string, string>> {
    const files: string[] = (await FsUtilities.findFilesRecursive(mockConstants.PROJECT_DIR)).filter(f => !f.includes('node_modules'));
    const contents: string[] = await Promise.all(files.map(f => FsUtilities.readFile(PathUtilities.resolve(mockConstants.PROJECT_DIR, f))));
    return Object.fromEntries(files.map((f, i) => [f, contents[i]]));
}

describe('WorkspaceSnapshotUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('restores the workspace as it was: changed and removed files, without the files and projects that came since', async () => {
        // what npm installed before, which the snapshot keeps as it is
        const installed: Path = PathUtilities.resolve(mockConstants.PROJECT_DIR, 'node_modules', 'zod', 'package.json');
        await FsUtilities.createFile(installed, '{ "name": "zod" }');
        const before: Record<string, string> = await readWorkspace();

        const snapshot: WorkspaceSnapshot = await WorkspaceSnapshotUtilities.create(mockConstants.PROJECT_DIR);
        // what a command that crashed halfway left behind
        await FsUtilities.updateFile(mockConstants.ENV, 'api_port=3000', 'append');
        await FsUtilities.rm(mockConstants.WORKSPACE_JSON);
        const newProject: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'shop');
        await FsUtilities.createFile(PathUtilities.resolve(newProject, 'package.json'), '{ "name": "shop" }');
        await FsUtilities.createFile(PathUtilities.resolve(newProject, 'node_modules', 'left', 'index.js'), '');
        await FsUtilities.createFile(PathUtilities.resolve(mockConstants.PROJECT_DIR, '.git', 'HEAD'), 'ref: refs/heads/main');

        expect(await WorkspaceSnapshotUtilities.restore(snapshot)).toEqual({ changed: true, lockfileChanged: false });
        expect(await readWorkspace()).toEqual(before);
        expect(await FsUtilities.exists(newProject)).toBe(false);
        expect(await FsUtilities.exists(PathUtilities.resolve(mockConstants.PROJECT_DIR, '.git'))).toBe(false);
        expect(await FsUtilities.readFile(installed)).toBe('{ "name": "zod" }');

        // nothing to do a second time
        expect(await WorkspaceSnapshotUtilities.restore(snapshot)).toEqual({ changed: false, lockfileChanged: false });
    });

    test('tells when the lockfile changed, as node_modules may then hold what npm installed since', async () => {
        const lockfile: Path = PathUtilities.resolve(mockConstants.PROJECT_DIR, 'package-lock.json');
        await FsUtilities.createFile(lockfile, '{ "lockfileVersion": 3 }');
        const snapshot: WorkspaceSnapshot = await WorkspaceSnapshotUtilities.create(mockConstants.PROJECT_DIR);
        await FsUtilities.updateFile(lockfile, '{ "lockfileVersion": 3, "packages": {} }', 'replace');

        expect(await WorkspaceSnapshotUtilities.restore(snapshot)).toEqual({ changed: true, lockfileChanged: true });
        expect(await FsUtilities.readFile(lockfile)).toBe('{ "lockfileVersion": 3 }');
    });
});