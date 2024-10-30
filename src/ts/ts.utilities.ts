import { FsUtilities } from '../encapsulation';
import { TsImportDefinition } from './ts-import-definition.model';

/**
 *
 */
export abstract class TsUtilities {

    /**
     *
     * @param path
     * @param imp
     * @param imports
     */
    static async addImportStatementsToFile(path: string, imports: TsImportDefinition[]): Promise<void> {
        for (const imp of imports) {
            let lines: string[] = await FsUtilities.readFileLines(path);
            lines = this.addImportStatement(lines, imp);
            await FsUtilities.updateFile(path, lines, 'replace');
        }
    }

    /**
     *
     * @param lines
     * @param imp
     */
    static addImportStatement(lines: string[], imp: TsImportDefinition): string[] {
        // check if an import from the path already exists
        const existingImport: string | undefined = lines.find(l => l.includes('import ') && l.includes(imp.path));
        if (!existingImport) {
            return [this.getNewImportStatement(imp), ...lines];
        }
        lines[lines.indexOf(existingImport)] = this.getUpdatedImportStatement(existingImport, imp);
        return lines;
    }

    private static getNewImportStatement(imp: TsImportDefinition): string {
        return imp.defaultImport
            ? `import ${imp.element} from \'${imp.path}\';`
            : `import { ${imp.element} } from \'${imp.path}\';`;
    }

    private static getUpdatedImportStatement(existingImport: string, imp: TsImportDefinition): string {
        if (imp.defaultImport && !existingImport.includes('{')) {
            throw new Error(`There is already a default import from ${imp.path}`);
        }
        if (imp.defaultImport) {
            return existingImport.replace('{', `${imp.element}, {`);
        }
        return existingImport.replace('import {', `import { ${imp.element},`);
    }
}