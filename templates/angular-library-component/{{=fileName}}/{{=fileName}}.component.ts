import { Component, computed, inject, input, InputSignal, Signal } from '@angular/core';

import { {{=className}}Color } from './{{=fileName}}-color.type';
import { {{=className}}Config } from './{{=fileName}}-config.model';
import { {{=constantName}}_CONFIG } from './{{=fileName}}-config.provider';

// the transparent border keeps the shape in forced colors mode, which removes backgrounds
const BASE_CLASSES: string = 'block rounded-card border border-transparent p-4 text-body';

// only pairs whose contrast is checked: each color with its on- color
const COLOR_CLASSES: Record<{{=className}}Color, string> = {
    surface: 'border-outline-variant bg-surface-container text-on-surface',
    primary: 'bg-primary text-on-primary',
    secondary: 'bg-secondary text-on-secondary'
};

/**
 * A box around content of its own: `<{{=selector}} color="primary">Opening hours changed</{{=selector}}>`.
 * Unset inputs fall back to the values provided with provide{{=className}}Config.
 */
@Component({
    selector: '{{=selector}}',
    templateUrl: './{{=fileName}}.component.html',
    host: {
        '[class]': 'classes()'
    }
})
export class {{=className}}Component {
    private readonly config: {{=className}}Config = inject({{=constantName}}_CONFIG);

    /**
     * Its color. The default comes from provide{{=className}}Config.
     */
    readonly color: InputSignal<{{=className}}Color> = input<{{=className}}Color>(this.config.color);

    /**
     * The tailwind classes of the {{=label}}.
     */
    protected readonly classes: Signal<string> = computed(() => [BASE_CLASSES, COLOR_CLASSES[this.color()]].join(' '));
}
