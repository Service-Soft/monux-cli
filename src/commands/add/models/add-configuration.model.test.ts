import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../../../__testing__';
import { validateProjectName } from './add-configuration.model';

const mockConstants: MockConstants = getMockConstants('add-configuration');

describe('validateProjectName', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('refuses a project without a name, which would be generated into apps or libs itself', async () => {
        expect(await validateProjectName('')).toBe('The project needs a name');
        expect(await validateProjectName('   ')).toBe('The project needs a name');
        expect(await validateProjectName('api')).toBe(true);
    });
});