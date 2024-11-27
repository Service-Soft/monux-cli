/* eslint-disable jsdoc/require-jsdoc */
import ts from 'typescript';

// eslint-disable-next-line typescript/no-explicit-any
type TsCompilerOptions = typeof ts.parseCommandLine extends (...args: any[]) => infer TResult ?
    TResult extends { options: infer TOptions } ? TOptions : never : never;

// eslint-disable-next-line typescript/no-explicit-any
type TypeAcquisition = typeof ts.parseCommandLine extends (...args: any[]) => infer TResult ?
    TResult extends { typeAcquisition?: infer TTypeAcquisition } ? TTypeAcquisition : never : never;

/**
 * Definition for the content of a tsconfig.json file.
 */
export interface TsConfig {
    compilerOptions: TsCompilerOptions,
    exclude?: string[],
    compileOnSave?: boolean,
    extends?: string,
    files?: string[],
    include?: string[],
    typeAcquisition?: TypeAcquisition
}