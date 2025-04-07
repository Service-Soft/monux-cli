/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

import { fakeUniqueString } from './helpers';
import { CalculatedEnvVariable, EnvironmentVariableKey } from '../../env';

export function fakeCalculatedEnvVariable(data?: Partial<CalculatedEnvVariable>): CalculatedEnvVariable {
    const type: 'string' | 'number' = faker.helpers.arrayElement(['string', 'number']);
    // eslint-disable-next-line typescript/typedef
    const fn = type === 'string' ? () => faker.lorem.word() : () => faker.number.int();
    return {
        key: fakeUniqueString() as EnvironmentVariableKey,
        value: fn,
        required: faker.datatype.boolean(),
        type: type,
        ...data
    };
}