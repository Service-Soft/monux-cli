# Goals of the Angular website

A website is what strangers find through a search engine and leave within seconds when it is slow. Everything it
generates is measured against the four goals below, together with [the goals of Monux](../../../../GOALS.md). They are
equally important, and in practice they rarely compete: a self-hosted font subset is faster *and* sends nothing to a
third party.

# The goals

**It loads as fast as a page can.** Every route is prerendered or rendered on the server, so the first paint needs no
JavaScript. What the browser downloads is what the page shows and nothing else: lazy routes, no library code a page
does not use, images in modern formats at the size they are shown, and fonts self-hosted and cut down to the glyphs
the site uses. A text whose letters are known when the site builds, like a logo, gets a font file of only those
letters. Core Web Vitals are "good" on a slow phone, not only on the developer's machine.

**Nothing a visitor has cached goes stale.** Only files whose name changes with their content, like the hashed
bundles, are cached for long. Everything else is revalidated on every visit, which costs a request that answers
"unchanged", not a download.

**Search engines understand it.** Every page has its own title, description and canonical url, `robots.txt` and the
sitemap are generated from the routes, links are real `<a href>` elements a crawler follows, and structured data
describes what the site is about. Imprint and privacy pages exist from the start.

**Everyone can use it.** Every page meets WCAG AA. The components come from `@service-soft/ui`, which already holds
itself to [the accessibility rules of angular-libraries](https://github.com/Service-Soft/angular-libraries/blob/release/CODE_STYLE.md#accessibility),
and the pages Monux generates follow the same rules.

**It sends nothing about a visitor before they agree.** No request to a third party on the first load: no font CDN, no
analytics, no embedded map. Tracking, when the developer asks for it, waits for consent through
`@service-soft/ngx-tracking`. A developer who does not need this, such as one outside of the EU, removes it in one
place.

# How it is held

Each goal needs a test on the website the tests generate, started in the `local` environment, which is the production
build:

- **Load time**: a Lighthouse performance score of 100 on mobile, and budgets for the initial JavaScript, the css and
  the fonts in `angular.json`, which fail the build.
- **SEO**: a Lighthouse SEO score of 100, and the generated `robots.txt` and sitemap list the routes.
- **Accessibility**: a Lighthouse accessibility score of 100 and no AXE violation on any generated page.
- **Privacy**: loading every generated page without consent makes no request to another origin.

# Changing it

**A dependency of the website has to earn its bytes.** Before adding one, say what it costs on the first load and
whether the page could do without it.

**Prefer what costs the visitor nothing at build time to what costs them at runtime.** A font subset, a prerendered
page or an image converted while the site builds are paid for once by the developer's machine, not on every visit.

**A goal given up for a feature changes this file first**, see [Changing it](../../../../GOALS.md#changing-it).
