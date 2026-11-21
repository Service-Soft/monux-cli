import { inject, InjectionToken, Provider } from '@angular/core';

import { {{=className}}Config } from './{{=fileName}}-config.model';

const DEFAULT_{{=constantName}}_CONFIG: {{=className}}Config = {
    color: 'surface'
};

/**
 * The values every {{=label}} below this injector uses when its inputs are not set.
 * Change them with provide{{=className}}Config.
 */
export const {{=constantName}}_CONFIG: InjectionToken<{{=className}}Config> = new InjectionToken<{{=className}}Config>(
    '{{=constantName}}_CONFIG',
    { providedIn: 'root', factory: () => DEFAULT_{{=constantName}}_CONFIG }
);

/**
 * Changes the values a {{=label}} uses when its inputs are not set.
 * Provide it in the application config for the whole app, or in a component or route for only that part of it.
 * Values you leave out are taken from the parent injector.
 * @param config - The values to change.
 * @returns The provider for {{=constantName}}_CONFIG.
 */
export function provide{{=className}}Config(config: Partial<{{=className}}Config>): Provider {
    return {
        provide: {{=constantName}}_CONFIG,
        useFactory: (): {{=className}}Config => ({
            ...inject({{=constantName}}_CONFIG, { skipSelf: true, optional: true }) ?? DEFAULT_{{=constantName}}_CONFIG,
            ...config
        })
    };
}
