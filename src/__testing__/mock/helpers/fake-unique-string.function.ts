/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

const usedKeys: string[] = [];
export function fakeUniqueString(): string {
    const key: string = faker.string.alpha({ length: { min: 2, max: 20 }, exclude: usedKeys });
    usedKeys.push(key);
    return key;
}