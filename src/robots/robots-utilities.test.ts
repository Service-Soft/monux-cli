
import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { RobotsUtilities } from './robots.utilities';
import { ROBOTS_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../env';
import { getPath } from '../utilities';

const mockConstants: MockConstants = getMockConstants('robots-utilities');

describe('RobotsUtilities', () => {

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants, ['ANGULAR_APP_COMPONENT_TS']);
        await EnvUtilities.init('test.com');
        await EnvUtilities.addStaticVariable({ key: DefaultEnvKeys.baseUrl('angular'), required: true, type: 'string', value: 'www.test.com' });
    });

    test('createRobotsTxtForApp', async () => {
        const isPublic: boolean = await EnvUtilities.getEnvVariable(DefaultEnvKeys.IS_PUBLIC, 'dev.docker-compose.yaml', getPath('.'));
        expect(isPublic).toBe(false);

        await RobotsUtilities.createRobotsTxtForApp(
            {
                path: mockConstants.ANGULAR_APP_DIR,
                name: mockConstants.ANGULAR_APP_NAME,
                npmWorkspaceString: `apps/${mockConstants.ANGULAR_APP_NAME}`
            },
            'dev.docker-compose.yaml',
            undefined,
            getPath('.')
        );

        const robotsTxt: string[] = await FsUtilities.readFileLines(getPath(mockConstants.ANGULAR_APP_DIR, 'src', ROBOTS_FILE_NAME));
        expect(robotsTxt).toEqual([
            'User-agent: *',
            'Disallow: /',
            '',
            'Sitemap: www.test.com/sitemap.xml'
        ]);
    });
});