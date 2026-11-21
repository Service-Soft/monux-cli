import CliTable3, { Table } from 'cli-table3';

import { ChalkUtilities } from './chalk.utilities';
import { LogUtilities } from './log.utilities';

/**
 * Definition for printing a table to the console.
 */
export type CliTable = {
    /**
     * The title of the table. Is displayed above.
     */
    title: string,
    /**
     * The headers of the table.
     */
    headers: string[],
    /**
     * The rows of the table.
     */
    rows: string[][]
};

/**
 * Encapsulates functionality of the cli-table3 package.
 */
export abstract class CliTableUtilities {
    /**
     * Logs the given table data pretty printed to the console.
     * @param data - The data of the table to print.
     */
    static logTable(data: CliTable): void {
        const table: Table = new CliTable3({
            head: data.headers.map(h => ChalkUtilities.secondary(h)),
            colWidths: [25, 25, 40],
            style: {
                compact: true
            }
        });

        for (const row of data.rows) {
            table.push(row);
        }

        LogUtilities.heading(data.title);
        LogUtilities.text(table.toString());
    }
}