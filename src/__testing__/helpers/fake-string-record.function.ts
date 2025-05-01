/* eslint-disable jsdoc/require-jsdoc */

import { faker } from '@faker-js/faker';

import { fakeUniqueString } from './fake-unique-string.function';

export function fakeStringRecord(length: number = faker.number.int({ min: 0, max: 5 })): Record<string, string> {
    const res: Record<string, string> = {};
    for (let i: number = 0; i < length; i++) {
        res[fakeUniqueString()] = faker.lorem.word();
    }
    return res;
}