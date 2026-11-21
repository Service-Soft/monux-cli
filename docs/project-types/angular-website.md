# Angular website

An Angular website is what visitors find through a search engine or an AI assistant: every page prerendered, fast on
a slow phone, accessible and described for crawlers. It sends nothing about a visitor before they agree, and it comes
with an imprint and a privacy page.

## Adding an Angular website

Run [`mx add`](../projects.md#adding-a-project-with-mx-add) and choose the type `angular-website`.

| Prompt | What it is |
|---|---|
| `Port` | The port of the website in development. 4200 by default |
| `Sub domain` | The sub domain the website is reached under. The root domain and `www` when left empty |
| `Name of the website, as its titles show it` | The name in the navbar and in the title of every page. The name of the project in Pascal case by default |
| `Languages of the website, the one it is written in first, like "en, de"` | See [Localization](../localization.md). `en` by default |
| `Trackings, asked for in a consent dialog` | Google Analytics, Google Tag Manager or Meta Pixel. None by default |
| `Allow AI models to train on its content? Assistants that look a page up to answer may either way` | Whether `robots.txt` lets the crawlers of AI training in. No by default |

The website is in `apps/<name>`, with a home page, an imprint and a privacy page. Its service is in
`local.docker-compose.yaml`, `stage.docker-compose.yaml` and `docker-compose.yaml`, with basic auth in front of it on
stage.

| Script | What it does |
|---|---|
| `npm start` | Serves the website in development, in its first language |
| `npm run build` | Builds the website in every language and prerenders its pages |
| `npm test` | Runs its tests once |
| `npm run lint` | Lints it, `npm run lint:fix` fixes what can be fixed |
| `npm run i18n` | Collects its texts for translation, see [Localization](../localization.md) |

## Adding a page

| Command | What it does |
|---|---|
| `mx generatePage`, `mx gp` | Adds a page to a website, with its route, its link and its description for search engines |

| Prompt | What it is |
|---|---|
| `Website` | The website to add the page to. Required |
| `Name of the page` | The name of the page, which is also its path, such as `about-us`. Required |
| `Title, as search results show it` | The title of the page in the browser and in search results. Required |
| `What is on the page, in one or two sentences` | The description search engines and AI assistants show for the page. Required |
| `Linked from` | Where the page is linked: `The navbar`, `The footer` or `Nowhere`. Required |

The page is in `src/app/pages/<name>`, prerendered, and listed in the sitemap and in `llms.txt`. Its texts are
collected for translation right away.

## Search engines and AI assistants

Each page tells search engines and AI assistants about itself, from the data of its route: its title, description,
canonical URL, structured data and the preview of a shared link. In a website of several languages, it links the page
in each of them. Its content is in the HTML the server sends, as most crawlers do not run scripts.

| File | What it is |
|---|---|
| `/robots.txt` | Lets every crawler in on production, and AI training only when chosen. Keeps every crawler out on stage |
| `/sitemap.xml` | Every page in every language, with the date it last changed where its route gives one |
| `/llms.txt` | The pages and what is on them, for AI assistants |

All three are generated from the pages when the website starts, so a page is listed as soon as it exists.

## Tracking with consent

A tracking chosen in `mx add` loads nothing before a visitor allowed it. The consent dialog of
[`@service-soft/ngx-tracking`](https://github.com/Service-Soft/angular-libraries) asks on the first interaction with
the page, a click, a key, a scroll or a move of the mouse, so a visitor sees the page first.

The ids of the trackings are in `.env.public`: `<name>_google_analytics_id`, `<name>_google_tag_manager_id` and
`<name>_meta_pixel_id`. They hold example values; set your own before you deploy.

The trackings are set up in `src/app/tracking.provider.ts`. To drop them, remove `provideTracking()` from
`src/app/app.config.ts` with the file.

## Loading fast

The website is checked against the budgets in `angular.json` on every build, which fails when a page gets too heavy.
The build also cuts the fonts in `public/fonts` down to the letters the website uses, so a visitor downloads only
those.

Only files whose name changes with their content, such as the bundles, are cached for long. Everything else is
revalidated on every visit.

## See also

- [Localization](../localization.md) — the website in several languages
- [Angular library](./angular-library.md) — components the website shares with other projects
- [Running the production build locally](../running.md#running-the-production-build-locally) — checking the website
  with Lighthouse
