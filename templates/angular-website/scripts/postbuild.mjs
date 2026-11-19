// What the production build of the website does after "ng build": it makes what a visitor downloads smaller.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import subsetFont from 'subset-font';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = join(root, 'dist', '{{=name}}', 'browser');
const require = createRequire(import.meta.url);

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

generateCss();
await subsetFonts();
