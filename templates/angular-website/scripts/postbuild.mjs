// What the production build of the website does after "ng build": it makes what a visitor downloads smaller.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';

import subsetFont from 'subset-font';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = join(root, 'dist', '{{=name}}', 'browser');
const require = createRequire(import.meta.url);
// what a browser downloads as text. Fonts and images are compressed by their format already
const COMPRESSED_EXTENSIONS = ['.html', '.js', '.css', '.svg', '.txt', '.xml', '.json'];

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
 * Generates the css again from the classes the build holds. Importing a library makes tailwind read all of its
 * components, this only keeps the ones the website uses. The result replaces the stylesheet under its hashed name.
 */
function generateCss() {
    // the cli only has a bin, which npm installs wherever the workspace hoisted it to
    const cliPackage = require.resolve('@tailwindcss/cli/package.json');
    const cli = join(dirname(cliPackage), JSON.parse(readFileSync(cliPackage, 'utf8')).bin.tailwindcss);
    for (const stylesheet of readdirSync(browser).filter(f => /^styles-.*\.css$/.test(f))) {
        execFileSync(
            process.execPath,
            [cli, '-i', join(root, 'src', 'styles.production.css'), '-o', join(browser, stylesheet), '--minify'],
            { cwd: root, stdio: 'inherit' }
        );
    }
}

/**
 * Cuts every font down to the characters the website shows, the text of its pages and of its scripts.
 * A font that knows every character of every language is mostly characters nobody sees.
 */
async function subsetFonts() {
    const files = findFiles(browser);
    const fonts = files.filter(f => ['.woff2', '.woff', '.ttf', '.otf'].includes(extname(f)));
    if (!fonts.length) {
        return;
    }
    const text = files
        .filter(f => ['.html', '.js'].includes(extname(f)))
        .map(f => readFileSync(f, 'utf8'))
        .join('');
    const characters = [...new Set(text)].join('');
    const formats = { '.woff2': 'woff2', '.woff': 'woff', '.ttf': 'truetype', '.otf': 'truetype' };
    for (const font of fonts) {
        const subset = await subsetFont(readFileSync(font), characters, { targetFormat: formats[extname(font)] });
        writeFileSync(font, subset);
    }
}

/**
 * Compresses every file a browser downloads as text, once and as small as it gets, with brotli and with gzip for the
 * browsers without it. The server sends the one the browser takes, so nothing is compressed while a visitor waits.
 */
function compressFiles() {
    for (const file of findFiles(browser).filter(f => COMPRESSED_EXTENSIONS.includes(extname(f)))) {
        const content = readFileSync(file);
        const brotliParams = { [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY };
        writeFileSync(`${file}.br`, brotliCompressSync(content, { params: brotliParams }));
        writeFileSync(`${file}.gz`, gzipSync(content, { level: zlibConstants.Z_BEST_COMPRESSION }));
    }
}

generateCss();
await subsetFonts();
// last, as it compresses what the steps before wrote
compressFiles();
