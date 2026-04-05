// eslint-disable-next-line jsdoc/require-jsdoc
export const buttonComponentTsContent: string = `import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * A button.
 */
@Component({
    selector: 'ui-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './button.component.html'
})
export class ButtonComponent {
    /**
     * The type of the button.
     */
    @Input()
    buttonType: 'button' | 'menu' | 'reset' | 'submit' = 'button';

    /**
     * The color theme of the button.
     */
    @Input()
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary';

    /**
     * Whether or not the button should look raised.
     */
    @Input()
    raised: boolean = true;
}`;