import { AxeBuilder } from '@axe-core/playwright';
import { AxeResults } from 'axe-core';
import { Browser, BrowserContext, Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PAGE_LEVEL_RULES } from '../.storybook/page-level-rules';
import { StoryIndexEntry } from './story-index-entry.model';
import { StorybookUtilities } from './storybook.utilities';

/**
 * A story and the color scheme of the operating system it gets checked in.
 */
type StoryCheck = StoryIndexEntry & {
    /**
     * The color scheme the browser reports, which the tokens follow.
     */
    colorScheme: 'light' | 'dark'
};

const STORY_CHECKS: StoryCheck[] = StorybookUtilities.findStories()
    .flatMap(entry => [{ ...entry, colorScheme: 'light' }, { ...entry, colorScheme: 'dark' }]);

describe('accessibility', () => {
    let browser: Browser;

    beforeAll(async () => {
        browser = await StorybookUtilities.launchBrowser();
    });

    afterAll(async () => {
        await browser.close();
    });

    // the same checks as the accessibility panel of storybook: everything except storybook's own elements
    test.for(STORY_CHECKS)('$title: $name passes all AXE checks in $colorScheme mode', async check => {
        const context: BrowserContext = await browser.newContext({ colorScheme: check.colorScheme });
        const page: Page = await context.newPage();
        await StorybookUtilities.renderStory(page, check.id);
        const results: AxeResults = await new AxeBuilder({ page })
            .exclude(['.sb-wrapper', '#storybook-docs', '#storybook-highlights-root'])
            .disableRules(PAGE_LEVEL_RULES)
            .analyze();
        await context.close();
        const violations: string[] = results.violations.flatMap(violation => violation.nodes.map(node => {
            return `${violation.id} on ${node.target.join(' ')}: ${node.failureSummary}`;
        }));
        expect(violations).toEqual([]);
    });
});
