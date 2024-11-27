/**
 * Same as partial, but all nested properties are also partials.
 */
export type DeepPartial<T> = T extends Map<infer KeyType, infer ValueType>
    ? PartialMapDeep<KeyType, ValueType>
    : T extends Set<infer ItemType>
        ? PartialSetDeep<ItemType>
        : T extends ReadonlyMap<infer KeyType, infer ValueType>
            ? PartialReadonlyMapDeep<KeyType, ValueType>
            : T extends ReadonlySet<infer ItemType>
                ? PartialReadonlySetDeep<ItemType>
                : T extends object
                    ? PartialObjectDeep<T>
                    : unknown;

/**
 * Same as `PartialDeep`, but accepts only `Map`s and as inputs. Internal helper for `PartialDeep`.
 */
type PartialMapDeep<KeyType, ValueType> = {} & Map<DeepPartial<KeyType>, DeepPartial<ValueType>>;

/**
 * Same as `PartialDeep`, but accepts only `Set`s as inputs. Internal helper for `PartialDeep`.
 */
type PartialSetDeep<T> = {} & Set<DeepPartial<T>>;

/**
 * Same as `PartialDeep`, but accepts only `ReadonlyMap`s as inputs. Internal helper for `PartialDeep`.
 */
type PartialReadonlyMapDeep<KeyType, ValueType> = {} & ReadonlyMap<DeepPartial<KeyType>, DeepPartial<ValueType>>;

/**
 * Same as `PartialDeep`, but accepts only `ReadonlySet`s as inputs. Internal helper for `PartialDeep`.
 */
type PartialReadonlySetDeep<T> = {} & ReadonlySet<DeepPartial<T>>;

/**
 * Same as `PartialDeep`, but accepts only `object`s as inputs. Internal helper for `PartialDeep`.
 */
type PartialObjectDeep<ObjectType extends object> = {
    [KeyType in keyof ObjectType]?: DeepPartial<ObjectType[KeyType]>
};