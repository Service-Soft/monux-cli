import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_INSTANT_TIME, MockConstants } from '../__testing__';
import { WorkspaceConfig } from './workspace-config.model';
import { WorkspaceProject, WorkspaceUtilities } from './workspace.utilities';
import { FsUtilities } from '../encapsulation';
import { getPath } from '../utilities';

const mockConstants: MockConstants = getMockConstants('workspace-utilities');

describe('WorkspaceUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants, []);
    });

    test('create config', async () => {
        const initialConfig: WorkspaceConfig | undefined = await WorkspaceUtilities.getConfig();
        expect(initialConfig).toEqual(undefined);

        await WorkspaceUtilities.createConfig();
        const config: WorkspaceConfig = await WorkspaceUtilities.getConfigOrFail();
        expect(config.name).toEqual('workspace-utilities');
    }, MAX_INSTANT_TIME);

    test('get projects', async () => {
        const projectsBefore: WorkspaceProject[] = await WorkspaceUtilities.getProjects('all', getPath('.'));
        expect(projectsBefore.length).toEqual(0);

        await FsUtilities.mkdir(mockConstants.ANGULAR_APP_DIR);

        const allProjects: WorkspaceProject[] = await WorkspaceUtilities.getProjects('all', getPath('.'));
        expect(allProjects.length).toEqual(1);

        const appProjects: WorkspaceProject[] = await WorkspaceUtilities.getProjects('apps', getPath('.'));
        expect(appProjects.length).toEqual(1);

        const libProjects: WorkspaceProject[] = await WorkspaceUtilities.getProjects('libs', getPath('.'));
        expect(libProjects.length).toEqual(0);
    }, MAX_INSTANT_TIME);
});