import { faker } from '@faker-js/faker';

// eslint-disable-next-line jsdoc/require-jsdoc
export function fakeArray<T>(generator: () => T, length: number = faker.number.int({ min: 0, max: 5 })): T[] {
    return Array.from({ length }, generator);
}