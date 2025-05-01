/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

import { EnvironmentVariableKey, EnvVariable } from '../../env';
import { fakeUniqueString } from '../helpers';

export function fakeEnvVariable(data?: Partial<EnvVariable>): EnvVariable {
    const type: 'string' | 'number' = faker.helpers.arrayElement(['string', 'number']);
    return {
        key: fakeUniqueString() as EnvironmentVariableKey,
        value: type === 'string' ? faker.lorem.word() : faker.number.int(),
        required: faker.datatype.boolean(),
        type: type,
        ...data
    };
}