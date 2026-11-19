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
 * Uses the chromium of playwright, which "npx playwright install chromium" installs.
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
        const browser: Browser = await chromium.launch({ channel: 'chromium', args: [`--remote-debugging-port=${LIGHTHOUSE_DEBUGGING_PORT}`] });
        try {
            const output: string = await CPUtilities.resolveOutput([
                lighthouse,
                url,
                `--port=${LIGHTHOUSE_DEBUGGING_PORT}`,
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
        const browser: Browser = await chromium.launch();
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
}
