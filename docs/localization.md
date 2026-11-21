# Localization

An [Angular website](./project-types/angular-website.md) or [Angular app](./project-types/angular-app.md) can be in
several languages. Each language is a build of its own with its own URLs, so search engines and AI assistants find
every page in every language, and a language switcher in the navbar links them.

## Choosing the languages

`mx add` asks for the languages of a website or app:

| Prompt | What it is |
|---|---|
| `Languages of the website, the one it is written in first, like "en, de"` | The codes of the languages, separated by commas, such as `en` or `de-AT`. The first is the one the texts of the project are written in. `en` by default |

With one language, the project is at the root of its domain: `example.com/imprint`.

With several, each language is below its code: `example.com/en/imprint` and `example.com/de/imprint`. A request
without a language, such as the link in a password reset mail, is redirected to the language of the browser. The
navbar gets a language switcher that links the same page in the other languages. It shows each language by its name
in that language, such as "Deutsch" for `de`, which is how its speakers find it.

The languages are in two places of the project, which have to agree:

| File | What it holds |
|---|---|
| `angular.json` | The `i18n` of the project: the first language as `sourceLocale`, every other one under `locales` with its translation file and its `subPath` |
| `src/app/languages.ts` | The languages for the language switcher, the sitemap and the links between the languages of a page |

## Marking a text for translation

A text in a template gets the `i18n` attribute, with an id:

```html
<!-- apps/website/src/app/pages/home/home.component.html -->
<h1 class="font-heading text-display" i18n="@@home.heading">Shop</h1>
```

A text in TypeScript is a `$localize` template string, with the id between colons:

```ts
// apps/website/src/app/tracking.provider.ts
const description: string = $localize`:@@tracking.googleAnalytics:Counts the visits of the pages. Shared with Google.`;
```

The id keeps a translation attached to its text when the text moves to another file. Name it after where the text
is, such as `home.heading`.

`src/index.html` is copied into the build as it is, so only its elements with an `i18n` id are translated, such as
the `<noscript>` text. Its translation is filled in after `ng build`, which `npm run build` runs.

## Translating the texts

| Command | What it does |
|---|---|
| `npm run i18n` | Collects the marked texts of the project and of the `@service-soft` libraries, and brings them into the translation file of every other language |
| `mx <project> i18n` | The same, from the root of the workspace, such as `mx website i18n` |

The texts are in [XLIFF 1.2](https://docs.oasis-open.org/xliff/v1.2/os/xliff-core.html), one file per language:

| File | What it holds |
|---|---|
| `src/locale/messages.xlf` | Every text, in the first language. Written by `npm run i18n`; do not change it |
| `src/locale/messages.<code>.xlf` | The translation of every text into one language, such as `messages.de.xlf`. This is the file you translate |

Each text is a `<trans-unit>` with the text as `<source>` and its translation as `<target>`. Translate a text by
writing its `<target>`, and remove the `state` attribute once it is done:

```xml
<!-- apps/website/src/locale/messages.de.xlf -->
<trans-unit id="home.heading" datatype="html">
  <source>Shop</source>
  <target>Laden</target>
</trans-unit>
```

`npm run i18n` keeps what you translated:

| The text | What its translation gets |
|---|---|
| Is new | Its source as `<target state="new">`, so the page shows it untranslated until someone translates it |
| Changed | Its translation, marked `state="needs-review-translation"` |
| Is gone from the project | Removed |
| Is unchanged | Nothing changes |

Run `npm run i18n` after changing texts, and before committing. [`mx generatePage`](./project-types/angular-website.md#adding-a-page)
runs it for the page it generates.

## Translating the texts of the libraries

The components of the `@service-soft` libraries, such as the consent dialog of `@service-soft/ngx-tracking`, come with
texts of their own in English. `npm run i18n` collects them like the texts of the project, with ids that start with
the name of the library, such as `ngx-tracking.consent.title`. Translate them in `messages.<code>.xlf` like any other
text.

Translate a default text in the translation files. Change it in the configuration of the library only to say
something else. A default the configuration replaces stays in the translation files, though no page shows it.

## Checking a translation during development

`npm start` serves only the first language, at the root. To check another one, set the `localize` of the
`development` configuration in `angular.json` to its code:

```json
"development": {
    "localize": ["de"]
}
```

`npm run build` builds every language.

## Adding a language

1. Add the language to `locales` in the `i18n` of `angular.json`, with its translation file and its code as `subPath`:
   `"fr": { "translation": "src/locale/messages.fr.xlf", "subPath": "fr" }`.
2. Add it to both lists of `src/app/languages.ts`.
3. Run `npm run i18n`, which creates `messages.fr.xlf` with every text marked as new.

A project of one language has its first language at the root. To add a second one, also set the `subPath` of the
`sourceLocale` to its code, such as `"en"`, in `angular.json` and `src/app/languages.ts`. A project generated with
one language has no language switcher; add it to `src/app/navigation.ts` as a project of several languages has it.

## See also

- [Angular website](./project-types/angular-website.md) — the pages, SEO and tracking of a website
- [Angular app](./project-types/angular-app.md) — the app of a zibri api
- [Angular i18n](https://angular.dev/guide/i18n) — how Angular builds a project in several languages
