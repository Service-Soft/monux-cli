// What "npm run i18n" does after "ng extract-i18n": it brings the texts of the project into the translation of every
// other language, the files of the locales in angular.json. A new text gets its source as its translation, marked as
// new, so the page shows it until someone translates it. A text whose source changed keeps its translation, marked
// for review, and a text the project no longer has is removed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UNIT_REGEX = /<trans-unit id="([^"]+)"[\s\S]*?<\/trans-unit>/g;
const SOURCE_REGEX = /<source>([\s\S]*?)<\/source>/;
const TARGET_REGEX = /<target[^>]*>[\s\S]*?<\/target>/;
// an element of index.html whose text is translated, like <noscript i18n="@@index.noscript">, see localize-index.mjs
const MARKED_REGEX = /<(\w+)[^>]*?\s+i18n="@@([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;

/**
 * The texts of src/index.html marked for translation, as units of xliff 1.2. ng extract-i18n leaves them out, as
 * Angular copies index.html as it is, and scripts/localize-index.mjs puts their translations into the build.
 * @returns {string[]} The units.
 */
function findIndexUnits() {
    const indexPath = join(root, 'src', 'index.html');
    if (!existsSync(indexPath)) {
        return [];
    }
    return [...readFileSync(indexPath, 'utf8').matchAll(MARKED_REGEX)].map(([, , id, text]) => [
        `      <trans-unit id="${id}" datatype="html">`,
        `        <source>${text}</source>`,
        '        <context-group purpose="location">',
        '          <context context-type="sourcefile">src/index.html</context>',
        '        </context-group>',
        '      </trans-unit>'
    ].join('\n'));
}

// the texts as "ng extract-i18n --output-path src/locale" writes them, in the language the project is written in, and
// the ones of index.html
const sourcePath = join(root, 'src', 'locale', 'messages.xlf');
const extracted = readFileSync(sourcePath, 'utf8');
// once, also when the script runs again without ng extract-i18n before
const indexUnits = findIndexUnits().filter(unit => !extracted.includes(unit.split('\n')[0].trim()));
const source = indexUnits.length
    ? extracted.replace(/\n(\s*)<\/body>/, (_, indentation) => `\n${indexUnits.join('\n')}\n${indentation}</body>`)
    : extracted;
writeFileSync(sourcePath, source);

/**
 * The units of a file of xliff 1.2, by their id.
 * @param {string} xliff - The content of the file.
 * @returns {Map<string, string>} Each unit as the file holds it.
 */
function findUnits(xliff) {
    return new Map([...xliff.matchAll(UNIT_REGEX)].map(([unit, id]) => [id, unit]));
}

/**
 * The translation of a unit: the one it has, marked for review when its source changed, or its source, marked as new.
 * @param {string} unit - The unit of the source.
 * @param {string | undefined} translated - The unit as the translation holds it, undefined for a new text.
 * @returns {string} The target of the unit.
 */
function resolveTarget(unit, translated) {
    const text = SOURCE_REGEX.exec(unit)?.[1] ?? '';
    const target = translated == undefined ? undefined : TARGET_REGEX.exec(translated)?.[0];
    if (target == undefined) {
        return `<target state="new">${text}</target>`;
    }
    const translatedText = SOURCE_REGEX.exec(translated)?.[1];
    return translatedText === text ? target : target.replace(/^<target[^>]*>/, '<target state="needs-review-translation">');
}

const angularJson = JSON.parse(readFileSync(join(root, 'angular.json'), 'utf8'));
for (const project of Object.values(angularJson.projects)) {
    for (const [code, locale] of Object.entries(project.i18n?.locales ?? {})) {
        const file = join(root, locale.translation);
        const translated = existsSync(file) ? findUnits(readFileSync(file, 'utf8')) : new Map();
        const translation = source
            .replace(/source-language="([^"]+)"/, `source-language="$1" target-language="${code}"`)
            // replaced by functions, as a text may hold a $ that a replacement string would read as a pattern
            .replaceAll(UNIT_REGEX, (unit, id) => {
                const target = resolveTarget(unit, translated.get(id));
                return unit.replace(/<\/source>/, () => `</source>\n        ${target}`);
            });
        writeFileSync(file, translation);
    }
}
