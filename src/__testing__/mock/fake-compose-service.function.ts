/* eslint-disable jsdoc/require-jsdoc */
import { faker } from '@faker-js/faker';

import { ComposePort, ComposeService } from '../../docker';
import { fakeStringKeyValue, fakeUniqueString, fakeArray } from '../helpers';

function fakeComposePort(): ComposePort {
    return {
        external: faker.number.int(),
        internal: faker.number.int()
    };
}

export function fakeComposeService(): ComposeService {
    return {
        environment: faker.helpers.maybe(() => fakeArray(() => fakeStringKeyValue(), faker.number.int({ min: 1, max: 5 }))),
        name: faker.lorem.word(),
        build: faker.helpers.maybe(() => faker.system.directoryPath()),
        image: faker.helpers.maybe(() => faker.word.noun()),
        networks: faker.helpers.maybe(() => fakeArray(() => fakeUniqueString(), faker.number.int({ min: 1, max: 5 }))),
        volumes: faker.helpers.maybe(() => fakeArray(() => faker.system.directoryPath(), faker.number.int({ min: 1, max: 5 }))),
        command: faker.helpers.maybe(() => fakeArray(() => faker.word.noun(), faker.number.int({ min: 1, max: 5 }))),
        ports: faker.helpers.maybe(() => fakeArray(() => fakeComposePort(), faker.number.int({ min: 1, max: 5 }))),
        labels: faker.helpers.maybe(() => fakeArray(() => faker.word.noun(), faker.number.int({ min: 1, max: 5 })))
    };
}