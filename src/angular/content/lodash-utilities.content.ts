// eslint-disable-next-line jsdoc/require-jsdoc
export const lodashUtilitiesContent: string
= `import { cloneDeep } from 'lodash';

export abstract class LodashUtilities {
    static cloneDeep<E>(value: E): E {
        return cloneDeep(value);
    }
}`;