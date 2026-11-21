import { FsUtilities, PathUtilities, Path } from '../encapsulation';

/**
 * The values that replace the placeholders of a template, by their name.
 * A placeholder is written as {{=name}}, in the content of a file or in its path.
 */
export type TemplatePlaceholders = Record<string, string>;

/**
 * A file of a template, with its placeholders replaced.
 */
type FilledTemplateFile = {
    /**
     * Where the file is written to.
     */
    path: Path,
    /**
     * The content of the file.
     */
    content: Buffer
};

/**
 * Which sections of a template are kept, by their name.
 */
export type TemplateSections = Record<string, boolean>;

/**
 * A section whose start was read, and whose end was not yet.
 */
type OpenTemplateSection = {
    /**
     * The name of the section.
     */
    name: string,
    /**
     * Whether the lines inside it are kept.
     */
    keep: boolean
};

// {{= cannot appear in what Monux generates otherwise: Angular interpolates {{ }} and javascript ${}.
const PLACEHOLDER_REGEX: RegExp = /\{\{=(\w+)\}\}/g;
// a line of its own, like {{#tracking}}, {{^tracking}} or {{/tracking}}, as the templates of zibri-cli write them
const SECTION_REGEX: RegExp = /^\s*\{\{([#/^])(\w+)\}\}\s*$/;

/**
 * Writes the templates in the templates directory of Monux into a workspace.
 */
export abstract class TemplateUtilities {

    /**
     * The directory holding the templates. Only changed by tests.
     */
    // eslint-disable-next-line typescript/prefer-readonly
    private static root: Path = PathUtilities.resolve(__dirname, '..', '..', 'templates');

    /**
     * Writes every file of the template with the given name into the destination, replacing the files that exist there.
     * @param templateName - The name of the directory of the template, such as "angular-app".
     * @param destination - The directory to write the files into.
     * @param placeholders - The values of the placeholders of the template.
     * @param sections - Which sections of the template are kept. A file that is empty without its sections is not written.
     * @throws When the template uses a placeholder or a section that is not given, or a given one is not used by the template.
     */
    static async write(
        templateName: string,
        destination: Path,
        placeholders: TemplatePlaceholders,
        sections: TemplateSections = {}
    ): Promise<void> {
        const templateDirectory: Path = PathUtilities.resolve(this.root, templateName);
        if (!await FsUtilities.exists(templateDirectory)) {
            throw new Error(`The template "${templateName}" does not exist in ${this.root}`);
        }
        const usedPlaceholders: Set<string> = new Set();
        const usedSections: Set<string> = new Set();
        const files: string[] = await FsUtilities.findFilesRecursive(templateDirectory);
        // every file is filled before the first one is written, so a template that does not fit its caller writes nothing.
        const filledFiles: (FilledTemplateFile | undefined)[] = await Promise.all(files.map(async file => {
            const bytes: Buffer = await FsUtilities.readFileBytes(PathUtilities.resolve(templateDirectory, file));
            const path: Path = PathUtilities.resolve(destination, this.fill(templateName, file, placeholders, usedPlaceholders));
            // a NUL byte means the file is not text, like an image, whose bytes are copied as they are.
            if (bytes.includes(0)) {
                return { path, content: bytes };
            }
            const text: string = this.applySections(templateName, file, bytes.toString('utf8'), sections, usedSections);
            return text.trim() === ''
                ? undefined
                : { path, content: Buffer.from(this.fill(templateName, text, placeholders, usedPlaceholders)) };
        }));

        const unusedPlaceholders: string[] = Object.keys(placeholders).filter(p => !usedPlaceholders.has(p));
        if (unusedPlaceholders.length) {
            throw new Error(`The template "${templateName}" does not use the placeholders ${unusedPlaceholders.join(', ')}`);
        }
        const unusedSections: string[] = Object.keys(sections).filter(s => !usedSections.has(s));
        if (unusedSections.length) {
            throw new Error(`The template "${templateName}" does not have the sections ${unusedSections.join(', ')}`);
        }

        await Promise.all(filledFiles.filter(f => f != undefined).map(f => FsUtilities.writeFileBytes(f.path, f.content)));
    }

    /**
     * Keeps the lines of the sections that are on, and drops the lines of the ones that are off.
     * A section is a line {{#name}} or, for its opposite, {{^name}}, up to a line {{/name}}. Sections can be nested.
     * @param templateName - The name of the template, for the errors.
     * @param file - The path of the file in the template, for the errors.
     * @param content - The content of the file.
     * @param sections - Which sections are on.
     * @param usedSections - The names of the sections the template uses, which this adds to.
     * @returns The content without the lines of the sections that are off, and without the lines of the markers.
     * @throws When a section is not given, or a marker has no counterpart.
     */
    private static applySections(
        templateName: string,
        file: string,
        content: string,
        sections: TemplateSections,
        usedSections: Set<string>
    ): string {
        const open: OpenTemplateSection[] = [];
        const kept: string[] = [];
        for (const line of content.split('\n')) {
            const marker: RegExpExecArray | null = SECTION_REGEX.exec(line);
            if (marker == undefined) {
                if (open.every(s => s.keep)) {
                    kept.push(line);
                }
                continue;
            }
            const [, kind, name] = marker;
            if (kind === '/') {
                if (open.pop()?.name !== name) {
                    throw new Error(`The section "${name}" in ${file} of the template "${templateName}" ends where it was not opened`);
                }
                continue;
            }
            open.push(this.openSection(templateName, name, kind === '^', sections, usedSections));
        }
        if (open.length) {
            throw new Error(`The section "${open[0].name}" in ${file} of the template "${templateName}" is not closed`);
        }
        return kept.join('\n');
    }

    private static openSection(
        templateName: string,
        name: string,
        inverted: boolean,
        sections: TemplateSections,
        usedSections: Set<string>
    ): OpenTemplateSection {
        const on: boolean | undefined = sections[name];
        if (on == undefined) {
            throw new Error(`The template "${templateName}" uses the section "${name}", which was not given`);
        }
        usedSections.add(name);
        return { name, keep: inverted ? !on : on };
    }

    private static fill(
        templateName: string,
        value: string,
        placeholders: TemplatePlaceholders,
        usedPlaceholders: Set<string>
    ): string {
        return value.replaceAll(PLACEHOLDER_REGEX, (_, name: string) => {
            const placeholder: string | undefined = placeholders[name];
            if (placeholder == undefined) {
                throw new Error(`The template "${templateName}" uses the placeholder "${name}", which was not given`);
            }
            usedPlaceholders.add(name);
            return placeholder;
        });
    }
}