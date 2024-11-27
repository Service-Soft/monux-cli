import { DeepPartial } from '../types';

/**
 * Deeply merges two object.
 * Supports nested properties.
 * @param target - The target to merge the properties onto.
 * @param source - The source to merge the properties from.
 * @returns The updated object.
 */
export function mergeDeep<T>(
    target: T,
    source: DeepPartial<T>
): T {
    if (typeof target !== 'object' || target === null || typeof source !== 'object' || source === null) {
        return source as T;
    }

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const targetValue: T[keyof T] = target[key as keyof T];
            const sourceValue: DeepPartial<T>[keyof DeepPartial<T>] = source[key];

            (target[key as keyof T] as T[keyof T]) = typeof sourceValue === 'object' && !Array.isArray(sourceValue)
                ? mergeDeep(
                    targetValue,
                    sourceValue as DeepPartial<T[keyof T]>
                )
                : sourceValue as T[keyof T];
        }
    }
    return target as T;
}