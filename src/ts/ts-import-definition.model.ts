/**
 * Definition for a typescript import.
 */
export type TsImportDefinition = {
    /**
     * The element that should be imported.
     */
    element: string,
    /**
     * The path of where to import from.
     */
    path: string,
    /**
     * Wether or not the element should be a default import.
     */
    defaultImport: boolean
};