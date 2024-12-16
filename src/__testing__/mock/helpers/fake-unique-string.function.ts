/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

const usedKeys: string[] = [];
export function fakeUniqueString(): string {
    const key: string = faker.string.alpha({ exclude: usedKeys });
    usedKeys.push(key);
    return key;
}