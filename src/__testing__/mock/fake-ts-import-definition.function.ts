/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

import { TsImportDefinition } from '../../ts';

export function fakeTsImportDefinition(): TsImportDefinition {
    return {
        defaultImport: faker.datatype.boolean(),
        element: faker.word.noun(),
        path: faker.system.directoryPath()
    };
}