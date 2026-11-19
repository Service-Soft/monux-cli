import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { APPS_DIRECTORY_NAME, ROBOTS_FILE_NAME } from '../constants';
import { FsUtilities, PathUtilities } from '../encapsulation';
import { DefaultEnvKeys, EnvUtilities, EnvValue } from '../env';

import { RobotsUtilities } from './robots.utilities';

const mockConstants: MockConstants = getMockConstants('robots-utilities');

describe('RobotsUtilities', () => {

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants, ['ANGULAR_APP_COMPONENT_TS']);
        await EnvUtilities.init('test.com', 'test-staging.com', 'user', 'password');
        await EnvUtilities.addStaticVariable({ key: DefaultEnvKeys.baseUrl('angular'), required: true, type: 'string', value: 'www.test.com' }, false);
    });

    test('createRobotsTxtForApp', async () => {
        const isPublic: EnvValue = await EnvUtilities.getEnvVariable(DefaultEnvKeys.ENV, 'dev.docker-compose.yaml', PathUtilities.resolve('.'));
        expect(isPublic).toEqual(EnvValue.DEV);

        await RobotsUtilities.createRobotsTxtForApp(
            {
                path: mockConstants.ANGULAR_APP_DIR,
                name: mockConstants.ANGULAR_APP_NAME,
                npmWorkspaceString: `${APPS_DIRECTORY_NAME}/${mockConstants.ANGULAR_APP_NAME}`
            },
            'dev.docker-compose.yaml',
            undefined,
            PathUtilities.resolve('.')
        );

        const robotsTxt: string[] = await FsUtilities.readFileLines(PathUtilities.resolve(mockConstants.ANGULAR_APP_DIR, 'src', ROBOTS_FILE_NAME));
        expect(robotsTxt).toEqual([
            'User-agent: *',
            'Disallow: /',
            '',
            'Sitemap: www.test.com/sitemap.xml'
        ]);
    });
});