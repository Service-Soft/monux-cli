/* eslint-disable no-console */
import figlet from 'figlet';

import { ChalkUtilities } from '.';

/**
 * Encapsulates functionality of the figlet package.
 */
export abstract class FigletUtilities {
    /**
     * Displays the logo "Monorepo" in full width.
     */
    static displayLogo(): void {
        console.log(
            ChalkUtilities.primary(
                figlet.textSync('Monux', { horizontalLayout: 'full' })
            )
        );
    }
}