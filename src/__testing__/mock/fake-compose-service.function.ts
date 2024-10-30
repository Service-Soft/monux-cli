/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker/.';

import { fakeStringKeyValue, fakeUniqueString, fakeArray } from './helpers';
import { ComposeService, ComposeServiceVolume } from '../../docker';

function fakeComposeVolume(): ComposeServiceVolume {
    return {
        path: faker.system.directoryPath(),
        mount: faker.helpers.maybe(() => faker.system.directoryPath())
    };
}

export function fakeComposeService(): ComposeService {
    return {
        environment: faker.helpers.maybe(() => fakeArray(() => fakeStringKeyValue(), faker.number.int({ min: 1, max: 5 }))),
        name: faker.lorem.word(),
        build: faker.helpers.maybe(() => faker.system.directoryPath()),
        image: faker.helpers.maybe(() => faker.word.noun()),
        networks: faker.helpers.maybe(() => fakeArray(() => fakeUniqueString(), faker.number.int({ min: 1, max: 5 }))),
        volumes: faker.helpers.maybe(() => fakeArray(() => fakeComposeVolume(), faker.number.int({ min: 1, max: 5 })))
    };
}