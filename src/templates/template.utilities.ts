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

// {{= cannot appear in what Monux generates otherwise: Angular interpolates {{ }} and javascript ${}.
const PLACEHOLDER_REGEX: RegExp = /\{\{=(\w+)\}\}/g;

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
     * @throws When the template uses a placeholder that is not given, or a given one is not used by the template.
     */
    static async write(templateName: string, destination: Path, placeholders: TemplatePlaceholders): Promise<void> {
        const templateDirectory: Path = PathUtilities.resolve(this.root, templateName);
        if (!await FsUtilities.exists(templateDirectory)) {
            throw new Error(`The template "${templateName}" does not exist in ${this.root}`);
        }
        const usedPlaceholders: Set<string> = new Set();
        const files: string[] = await FsUtilities.findFilesRecursive(templateDirectory);
        // every file is filled before the first one is written, so a template that does not fit its caller writes nothing.
        const filledFiles: FilledTemplateFile[] = await Promise.all(files.map(async file => {
            const bytes: Buffer = await FsUtilities.readFileBytes(PathUtilities.resolve(templateDirectory, file));
            const path: string = this.fill(templateName, file, placeholders, usedPlaceholders);
            return {
                path: PathUtilities.resolve(destination, path),
                // a NUL byte means the file is not text, like an image, whose bytes are copied as they are.
                content: bytes.includes(0)
                    ? bytes
                    : Buffer.from(this.fill(templateName, bytes.toString('utf8'), placeholders, usedPlaceholders))
            };
        }));

        const unusedPlaceholders: string[] = Object.keys(placeholders).filter(p => !usedPlaceholders.has(p));
        if (unusedPlaceholders.length) {
            throw new Error(`The template "${templateName}" does not use the placeholders ${unusedPlaceholders.join(', ')}`);
        }

        await Promise.all(filledFiles.map(f => FsUtilities.writeFileBytes(f.path, f.content)));
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