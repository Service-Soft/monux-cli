/**
 * Strict version of omit.
 */
export type OmitStrict<T extends object, K extends keyof T> = Pick<
    T,
    Exclude<keyof T, K>
>;