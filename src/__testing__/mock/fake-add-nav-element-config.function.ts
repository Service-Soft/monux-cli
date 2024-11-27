/* eslint-disable jsdoc/require-jsdoc */
import { AddNavElementConfig, NavElementTypes } from '../../angular';

export function fakeAddNavElementConfig(addTo: 'navbar' | 'footer' = 'navbar'): AddNavElementConfig {
    return {
        addTo: addTo,
        rowIndex: 0,
        element: {
            type: NavElementTypes.TITLE_WITH_INTERNAL_LINK,
            title: 'Test',
            link: {
                route: {
                    path: '',
                    title: 'Test | Website',
                    // @ts-ignore
                    // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-member-access, promise/prefer-await-to-then
                    loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent)
                }
            }
        }
    };
}