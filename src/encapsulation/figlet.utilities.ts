import figlet from 'figlet';

import { ChalkUtilities } from './chalk.utilities';
import { LogUtilities } from './log.utilities';

/**
 * Encapsulates functionality of the figlet package.
 */
export abstract class FigletUtilities {
    /**
     * Displays the logo "Monux" in full width.
     */
    static displayLogo(): void {
        LogUtilities.text(ChalkUtilities.primary(figlet.textSync('Monux', { horizontalLayout: 'full' })));
    }
}