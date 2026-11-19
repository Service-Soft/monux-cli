
import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';

const mockConstants: MockConstants = getMockConstants('storybook-utilities');

describe('StorybookUtilities', () => {

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('TODO', () => {
        expect(true).toBe(true);
    });
});