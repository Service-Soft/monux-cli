import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { GeneratePageCommand } from './generate-page.command';
import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MAX_GEN_CODE_TIME, MockConstants, inquireMock } from '../../__testing__';
import { InquirerUtilities } from '../../encapsulation';
import { AddAngularWebsiteCommand } from '../add/add-angular-website';
import { AddConfiguration, AddType } from '../add/models';

const mockConstants: MockConstants = getMockConstants('generate-page-command');

describe('GeneratePageCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            Project: 'website',
            'Page name': 'dashboard',
            Route: 'dashboard',
            Title: 'Dashboard | Website',
            port: 4200,
            'sub domain': undefined,
            'title suffix (eg. "| My Company")': '| Website',
            'Add tracking?': false
        }));
    });

    test('should run', async () => {
        const baseConfig: AddConfiguration = { name: 'website', type: AddType.ANGULAR_WEBSITE };
        const addWebsiteCommand: AddAngularWebsiteCommand = new AddAngularWebsiteCommand(baseConfig);
        await addWebsiteCommand.run();

        const command: GeneratePageCommand = new GeneratePageCommand();
        await command.start(['gp']);
        expect(true).toBe(true);
    }, MAX_ADD_TIME + MAX_GEN_CODE_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});