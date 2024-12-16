/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

import { fakeArray, fakeStringRecord, fakeUniqueString } from './helpers';
import { PackageJson } from '../../npm';

export function fakeUpdatePackageJsonData(): Partial<PackageJson> {
    return {
        main: faker.helpers.maybe(() => faker.system.fileName()),
        scripts: faker.helpers.maybe(() => fakeStringRecord()),
        workspaces: faker.helpers.maybe(() => fakeArray(() => fakeUniqueString()))
    };
}