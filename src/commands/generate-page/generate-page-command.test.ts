import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { GeneratePageCommand } from './generate-page.command';
import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../__testing__';
import { InquirerUtilities } from '../../encapsulation';
import { AddAngularWebsiteCommand } from '../add/add-angular-website';
import { AddConfiguration, AddType } from '../add/models';

const mockConstants: MockConstants = getMockConstants('generate-page-command');

describe('GeneratePageCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            projectName: 'website',
            pageName: 'dashboard',
            route: 'dashboard',
            title: 'Dashboard | Website',
            port: 4200,
            subDomain: undefined,
            titleSuffix: '| Website',
            addTracking: false
        }));
    });

    test('should run', async () => {
        const baseConfig: AddConfiguration = { name: 'website', type: AddType.ANGULAR_WEBSITE };
        const addWebsiteCommand: AddAngularWebsiteCommand = new AddAngularWebsiteCommand(baseConfig);
        await addWebsiteCommand.run();

        const command: GeneratePageCommand = new GeneratePageCommand();
        await command.start(['gp']);
        expect(true).toBe(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});