import { ChildProcess, spawn } from 'node:child_process';

import { Browser, chromium, Page } from 'playwright-core';

import { CPUtilities, JsonUtilities, Path, PathUtilities } from '../../encapsulation';

const LIGHTHOUSE_DEBUGGING_PORT: number = 9333;

/**
 * A built website, started for a test.
 */
export type RunningWebsite = {
    /**
     * Where the website answers.
     */
    url: string,
    /**
     * Stops the server of the website.
     */
    stop: () => void
};

/**
 * The scores of the categories lighthouse rates a page in, from 0 to 1.
 */
export type LighthouseScores = Record<'performance' | 'accessibility' | 'seo', number>;

/**
 * What lighthouse writes as json, as far as a test reads it.
 */
type LighthouseResult = {
    // eslint-disable-next-line jsdoc/require-jsdoc
    categories: Record<keyof LighthouseScores, { score: number }>
};

/**
 * Starts and measures the websites the tests generate, the way a visitor and a search engine get them.
 * Uses the chromium of playwright, which "npx playwright-core install chromium" installs, or the browser CHROME_PATH names.
 */
export abstract class WebsiteUtilities {
    /**
     * Starts the server of a built website, as its docker image does.
     * @param projectPath - The path of the website project.
     * @param name - The name of the website project.
     * @param port - The port to start it on.
     * @returns The running website, once it answers.
     */
    static async start(projectPath: Path, name: string, port: number): Promise<RunningWebsite> {
        const server: ChildProcess = spawn(process.execPath, [PathUtilities.resolve(projectPath, 'dist', name, 'server', 'server.mjs')], {
            env: { ...process.env, PORT: String(port), NG_ALLOWED_HOSTS: 'localhost' },
            stdio: 'ignore'
        });
        const url: string = `http://localhost:${port}`;
        for (let attempt: number = 0; attempt < 50; attempt++) {
            try {
                const response: Response = await fetch(`${url}/robots.txt`);
                if (response.ok) {
                    return { url, stop: () => server.kill() };
                }
            }
            catch {
                // not listening yet
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        server.kill();
        throw new Error(`The website did not start on ${url}`);
    }

    /**
     * Rates the page at the given url with lighthouse, on a throttled phone.
     * @param url - The url of the page.
     * @returns The scores of the page.
     */
    static async resolveLighthouseScores(url: string): Promise<LighthouseScores> {
        // the cli of Monux's own lighthouse, as lighthouse is an es module, which the tests of Monux cannot import. It
        // connects to the chromium playwright starts, which starts where the launcher of lighthouse does not find a port
        const lighthouse: Path = PathUtilities.resolve(__dirname, '..', '..', '..', 'node_modules', '.bin', 'lighthouse');
        // the whole chromium rather than the headless shell playwright starts by default, which lacks what lighthouse traces
        const browser: Browser = await this.launchBrowser('chromium', [`--remote-debugging-port=${LIGHTHOUSE_DEBUGGING_PORT}`]);
        try {
            const output: string = await CPUtilities.resolveOutput([
                lighthouse,
                url,
                `--port=${LIGHTHOUSE_DEBUGGING_PORT}`,
                // a browser that does not load the page fails the test here, rather than when the test times out
                '--max-wait-for-load=30000',
                '--quiet',
                '--output=json',
                '--only-categories=performance,accessibility,seo'
            ].join(' '));
            const result: LighthouseResult = JsonUtilities.parse(output);
            return {
                performance: result.categories.performance.score,
                accessibility: result.categories.accessibility.score,
                seo: result.categories.seo.score
            };
        }
        finally {
            await browser.close();
        }
    }

    /**
     * Finds every request the page at the given url makes to another origin, while it loads and settles, as a visitor
     * who has not agreed to anything yet.
     * @param url - The url of the page.
     * @returns The urls of the requests to other origins.
     */
    static async findThirdPartyRequests(url: string): Promise<string[]> {
        const browser: Browser = await this.launchBrowser(undefined, []);
        try {
            const page: Page = await browser.newPage();
            const origin: string = new URL(url).origin;
            const requests: string[] = [];
            page.on('request', request => {
                if (new URL(request.url()).origin !== origin) {
                    requests.push(request.url());
                }
            });
            await page.goto(url, { waitUntil: 'networkidle' });
            return requests;
        }
        finally {
            await browser.close();
        }
    }

    /**
     * Starts the browser of playwright, or the one CHROME_PATH names. Playwright supports its chromium on Ubuntu and
     * Debian only, so on another Linux CHROME_PATH can name the Chrome or Chromium the system installed.
     * @param channel - Which build of playwright's chromium to start without CHROME_PATH, the headless shell by default.
     * @param args - The arguments to start the browser with.
     * @returns The started browser.
     */
    private static async launchBrowser(channel: 'chromium' | undefined, args: string[]): Promise<Browser> {
        const executablePath: string | undefined = process.env['CHROME_PATH'];
        return executablePath
            ? await chromium.launch({ executablePath, args })
            : await chromium.launch({ channel, args });
    }
}