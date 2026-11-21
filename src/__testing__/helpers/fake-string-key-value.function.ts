/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

import { KeyValue } from '../../types';
import { fakeUniqueString } from './fake-unique-string.function';

export function fakeStringKeyValue(): KeyValue<string> {
    return {
        key: fakeUniqueString(),
        value: faker.lorem.word()
    };
}