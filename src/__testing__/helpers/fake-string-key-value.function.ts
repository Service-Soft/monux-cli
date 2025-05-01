/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

import { fakeUniqueString } from './fake-unique-string.function';
import { KeyValue } from '../../types';

export function fakeStringKeyValue(): KeyValue<string> {
    return {
        key: fakeUniqueString(),
        value: faker.lorem.word()
    };
}