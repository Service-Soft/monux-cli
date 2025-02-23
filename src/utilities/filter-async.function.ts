/**
 * Filters the given array async.
 * @param array - The array to filter.
 * @param callback - The async filter method to apply.
 * @returns The filtered array.
 */
export async function filterAsync<T>(
    array: T[],
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    callback: (value: T, index: number, array: T[]) => Promise<boolean>
): Promise<T[]> {
    const filterResults: boolean[] = await Promise.all(array.map(callback));
    return array.filter((_, index) => filterResults[index]);
}