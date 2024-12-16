/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

import { fakeUniqueString } from './helpers';
import { EnvVariable } from '../../env';

export function fakeEnvVariable(data?: Partial<EnvVariable>): EnvVariable {
    const type: 'string' | 'number' = faker.helpers.arrayElement(['string', 'number']);
    return {
        key: fakeUniqueString(),
        value: type === 'string' ? faker.lorem.word() : faker.number.int(),
        required: faker.datatype.boolean(),
        type: type,
        ...data
    };
}