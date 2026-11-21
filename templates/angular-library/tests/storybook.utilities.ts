import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { Browser, chromium, Page, Route } from 'playwright';

import { StoryIndexEntry } from './story-index-entry.model';

// what "ng run {{=name}}:build-storybook" builds, which "npm test" does before the checks
const STORYBOOK_PATH: string = path.resolve(import.meta.dirname, '../storybook-static');
// playwright answers every request to this origin from the build, so no server has to run. https, so the page is a
// secure context like a real site; no certificate is involved
const STORYBOOK_ORIGIN: string = 'https://storybook.test';

/**
 * The index.json storybook builds.
 */
type StoryIndex = {
    /**
     * The stories and docs pages by their id.
     */
    entries: Record<string, StoryIndexEntry>
};

/**
 * Utilities for testing the stories of the storybook that "npm test" builds, in a real browser.
 */
export abstract class StorybookUtilities {
    /**
     * Finds every story of the build.
     * @returns The stories, without docs pages.
     */
    static findStories(): StoryIndexEntry[] {
        const index: StoryIndex = JSON.parse(readFileSync(path.join(STORYBOOK_PATH, 'index.json'), 'utf8')) as StoryIndex;
        return Object.values(index.entries).filter(entry => entry.type === 'story');
    }

    /**
     * Starts the chromium of playwright, which "npx playwright install chromium" installs, or the browser CHROME_PATH
     * names, like the Chrome a Linux playwright does not support installed itself.
     * @returns The browser.
     */
    static async launchBrowser(): Promise<Browser> {
        const executablePath: string | undefined = process.env['CHROME_PATH'];
        return executablePath ? await chromium.launch({ executablePath }) : await chromium.launch();
    }

    /**
     * Opens a story on its own, like the canvas of storybook shows it.
     * @param page - The page to open the story in.
     * @param id - The id of the story.
     * @throws {Error} When the story failed to render.
     */
    static async renderStory(page: Page, id: string): Promise<void> {
        await page.route(`${STORYBOOK_ORIGIN}/**`, route => this.serveStorybook(route));
        // the a11y addon would run AXE in the story as well, which the tests do themselves: two runs at once fail with
        // "Axe is already running". Its manual mode only runs it from the panel
        await page.goto(`${STORYBOOK_ORIGIN}/iframe.html?id=${id}&viewMode=story&globals=a11y.manual:!true`);
        // storybook shows either the story or its error once rendering finished
        await page.waitForSelector('body.sb-show-main, body.sb-show-errordisplay');
        if (await page.locator('body.sb-show-errordisplay').count()) {
            throw new Error(`The story failed to render: ${await page.locator('#error-message').textContent()}`);
        }
    }

    private static async serveStorybook(route: Route): Promise<void> {
        const filePath: string = path.join(STORYBOOK_PATH, new URL(route.request().url()).pathname);
        await (existsSync(filePath) ? route.fulfill({ path: filePath }) : route.fulfill({ status: 404 }));
    }
}
