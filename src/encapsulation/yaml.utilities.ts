import yaml from 'js-yaml';

/**
 * Encapsulates functionality of the js-yaml package.
 */
export abstract class YamlUtilities {
    /**
     * Parses the given yaml.
     * @param content - The yaml to parse.
     * @returns The parsed value, or undefined for an empty document.
     */
    static parse<T>(content: string): T | undefined {
        return yaml.load(content) as T | undefined;
    }

    /**
     * Stringifies the given value as yaml, indented by 4 spaces.
     * @param value - The value to stringify.
     * @returns The yaml.
     */
    static stringify(value: unknown): string {
        return yaml.dump(value, { indent: 4 });
    }
}