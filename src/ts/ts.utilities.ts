import { FsUtilities } from '../encapsulation';
import { TsImportDefinition } from './ts-import-definition.model';

/**
 * Utilities for handling typescript files.
 */
export abstract class TsUtilities {

    /**
     * Adds the given imports to the file at the given path.
     * @param path - The path of the ts file to add the imports to.
     * @param imports - The imports to add.
     */
    static async addImportStatementsToFile(path: string, imports: TsImportDefinition[]): Promise<void> {
        for (const imp of imports) {
            let lines: string[] = await FsUtilities.readFileLines(path);
            lines = this.addImportStatement(lines, imp);
            await FsUtilities.updateFile(path, lines, 'replace');
        }
    }

    private static addImportStatement(lines: string[], imp: TsImportDefinition): string[] {
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
        if (existingImport.includes('{')) {
            return existingImport.replace('import {', `import { ${imp.element},`);
        }
        return existingImport.replace('import ', `import { ${imp.element} }, `);
    }
}