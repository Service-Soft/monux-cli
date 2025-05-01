import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../../__testing__';
import { InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddAngularWebsiteCommand } from './add-angular-website.command';

const mockConstants: MockConstants = getMockConstants('add-angular-website-command');

describe('AddAngularWebsiteCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            port: 4200,
            'sub domain': undefined,
            'title suffix (eg. "| My Company")': '| Website',
            'Add tracking?': false
        }));
    });

    test('should run', async () => {
        const baseConfig: AddConfiguration = { name: 'website', type: AddType.ANGULAR_WEBSITE };
        const command: AddAngularWebsiteCommand = new AddAngularWebsiteCommand(baseConfig);
        await command.run();
        expect(true).toBe(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});