/* eslint-disable jsdoc/require-jsdoc */
import ts from 'typescript';

type TsCompilerOptions = typeof ts.parseCommandLine extends (...args: any[]) => infer TResult ?
    TResult extends { options: infer TOptions } ? TOptions : never : never;

type TypeAcquisition = typeof ts.parseCommandLine extends (...args: any[]) => infer TResult ?
    TResult extends { typeAcquisition?: infer TTypeAcquisition } ? TTypeAcquisition : never : never;

/**
 *
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