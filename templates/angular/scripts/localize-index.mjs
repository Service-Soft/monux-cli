// What the build does after "ng build": it puts the translations of the texts of src/index.html marked with
// i18n="@@<id>", like the <noscript>, into the pages of every language. Angular translates the texts of the app, but
// copies index.html as it is: into the pages in browser/, into the copies the server answers with in server/, which
// angular-app-manifest.mjs lists with their size and hash, and into the list of the service worker, ngsw.json, which
// checks the hash of every file. The build fails when its output is no longer what this script expects.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// an element of index.html whose text is translated, like <noscript i18n="@@index.noscript">
const MARKED_REGEX = /<(\w+)([^>]*?)\s+i18n="@@([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g;
const UNIT_REGEX = /<trans-unit id="([^"]+)"[\s\S]*?<\/trans-unit>/g;
const TARGET_REGEX = /<target[^>]*>([\s\S]*?)<\/target>/;
// how Angular escapes an html file in the module of its copy in server/, see its manifest.js
const TEMPLATE_LITERAL_REGEX = /^export default `([\s\S]*)`;$/;

/**
 * The paths of the files below the given directory.
 * @param {string} directory - The directory to search.
 * @returns {string[]} The paths, including the ones in subdirectories.
 */
function findFiles(directory) {
    return readdirSync(directory, { withFileTypes: true, recursive: true })
        .filter(entry => entry.isFile())
        .map(entry => join(entry.parentPath, entry.name));
}

/**
 * The texts of a language, by their id: the translations of its file, or the texts of index.html for the language
 * the project is written in.
 * @param {string | undefined} translation - The path of the file of the translation, undefined for the source.
 * @param {Map<string, string>} sourceTexts - The texts of index.html, by their id.
 * @returns {Map<string, string>} The texts.
 */
function findTexts(translation, sourceTexts) {
    if (translation == undefined) {
        return sourceTexts;
    }
    const units = [...readFileSync(join(root, translation), 'utf8').matchAll(UNIT_REGEX)];
    return new Map(units.map(([unit, id]) => [id, TARGET_REGEX.exec(unit)?.[1] ?? sourceTexts.get(id) ?? '']));
}

/**
 * Puts the texts of a language into the marked elements of a page, without the marker.
 * @param {string} html - The page.
 * @param {Map<string, string>} texts - The texts of the language, by their id.
 * @param {(text: string) => string} escape - How a text is written into the file, like for a template literal.
 * @returns {string} The page in the language.
 */
function translate(html, texts, escape) {
    return html.replaceAll(MARKED_REGEX, (_, tag, before, id, after, text) => {
        return `<${tag}${before}${after}>${texts.has(id) ? escape(texts.get(id)) : text}</${tag}>`;
    });
}

/**
 * Translates the copies of the pages in server/, and their size and hash in angular-app-manifest.mjs: the server
 * sends the size as the Content-Length and the hash as the ETag.
 * @param {string} serverDirectory - The server directory of the language.
 * @param {Map<string, string>} texts - The texts of the language.
 * @throws {Error} When a copy or the manifest is no longer written the way Angular 22 writes them.
 */
function translateServerCopies(serverDirectory, texts) {
    const manifestPath = join(serverDirectory, 'angular-app-manifest.mjs');
    let manifest = readFileSync(manifestPath, 'utf8');
    // below the path of the page they copy, like assets-chunks/imprint/index.html.mjs
    const chunks = join(serverDirectory, 'assets-chunks');
    for (const chunkPath of findFiles(chunks).filter(file => file.endsWith('.html.mjs'))) {
        const module = readFileSync(chunkPath, 'utf8');
        if (!module.includes(' i18n="@@')) {
            continue;
        }
        const literal = TEMPLATE_LITERAL_REGEX.exec(module)?.[1];
        if (literal == undefined) {
            throw new Error(`${chunkPath} is no longer the template literal Angular wrote it as, so its texts can't be translated`);
        }
        const translated = translate(literal, texts, text => text.replaceAll(/[$`\\]/g, c => `\\${c}`));
        writeFileSync(chunkPath, `export default \`${translated}\`;`);
        // the page as the server sends it, which a template literal holds without the escapes and with \n for \r\n
        const html = translated.replaceAll(/\\([$`\\])/g, '$1').replaceAll('\r\n', '\n');
        const size = Buffer.byteLength(html);
        // only has to change with the page, as the ETag
        const hash = createHash('sha256').update(html).digest('hex').slice(0, 16);
        const asset = relative(chunks, chunkPath).split(sep).join('/').replace(/\.mjs$/, '');
        const entry = new RegExp(`(${JSON.stringify(asset).replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}: \\{size: )\\d+(, hash: )"[^"]*"`);
        if (!entry.test(manifest)) {
            throw new Error(`${manifestPath} no longer lists ${asset} with its size and hash, so its translation can't be served`);
        }
        manifest = manifest.replace(entry, `$1${size}$2"${hash}"`);
    }
    writeFileSync(manifestPath, manifest);
}

/**
 * Translates the pages in browser/, and their hashes in the list of the service worker, which refuses a file whose
 * hash isn't the one it lists.
 * @param {string} browser - The browser directory of the build.
 * @param {string} browserDirectory - The browser directory of the language.
 * @param {Map<string, string>} texts - The texts of the language.
 */
function translateBrowserPages(browser, browserDirectory, texts) {
    const ngswPath = join(browserDirectory, 'ngsw.json');
    const ngsw = existsSync(ngswPath) ? JSON.parse(readFileSync(ngswPath, 'utf8')) : undefined;
    for (const page of findFiles(browserDirectory).filter(file => extname(file) === '.html')) {
        const html = readFileSync(page, 'utf8');
        const translated = translate(html, texts, text => text);
        if (translated === html) {
            continue;
        }
        writeFileSync(page, translated);
        const url = `/${relative(browser, page).split(sep).join('/')}`;
        if (ngsw != undefined && url in ngsw.hashTable) {
            ngsw.hashTable[url] = createHash('sha1').update(translated).digest('hex');
        }
    }
    if (ngsw != undefined) {
        writeFileSync(ngswPath, JSON.stringify(ngsw, undefined, 2));
    }
}

const angularJson = JSON.parse(readFileSync(join(root, 'angular.json'), 'utf8'));
const [[name, project]] = Object.entries(angularJson.projects);
const sourceTexts = new Map([...readFileSync(join(root, 'src', 'index.html'), 'utf8').matchAll(MARKED_REGEX)].map(m => [m[3], m[5]]));
const browser = join(root, 'dist', name, 'browser');
const languages = [
    { subPath: project.i18n.sourceLocale.subPath, translation: undefined },
    ...Object.values(project.i18n.locales)
];
for (const language of languages) {
    const texts = findTexts(language.translation, sourceTexts);
    const browserDirectory = join(browser, language.subPath);
    translateBrowserPages(browser, browserDirectory, texts);
    const serverDirectory = join(root, 'dist', name, 'server', language.subPath);
    const serverTemplate = join(serverDirectory, 'index.server.html');
    if (existsSync(serverTemplate)) {
        writeFileSync(serverTemplate, translate(readFileSync(serverTemplate, 'utf8'), texts, text => text));
    }
    translateServerCopies(serverDirectory, texts);
}
// a page that still has a marker kept its text in the source language
const untranslated = findFiles(join(root, 'dist', name)).filter(file => {
    return /\.html(\.mjs)?$/.test(file) && readFileSync(file, 'utf8').includes(' i18n="@@');
});
if (untranslated.length) {
    throw new Error(`The build has pages this script didn't translate, as Angular writes them elsewhere: ${untranslated.join(', ')}`);
}
