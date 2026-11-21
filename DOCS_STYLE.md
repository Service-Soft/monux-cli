# Documentation style

How the documentation of Monux is written. Read this before you write or change it.

The documentation is for two readers at once: a developer who is new to Monux, and the AI assistant that developer
asks for help. Both need the same things: exact names, tables that list everything, examples that work when copied,
and one topic in one place. A page that serves one of them well serves the other.

# Table of Contents

- [Documentation style](#documentation-style)
- [Table of Contents](#table-of-contents)
- [The reader](#the-reader)
- [The voice](#the-voice)
  - [What stays out](#what-stays-out)
  - [Reasons](#reasons)
  - [Warnings and limits](#warnings-and-limits)
  - [Words and punctuation](#words-and-punctuation)
- [A page](#a-page)
  - [The intro](#the-intro)
  - [Sections](#sections)
  - [Commands](#commands)
  - [Prompt and option tables](#prompt-and-option-tables)
  - [See also](#see-also)
- [Examples](#examples)
- [Pages and folders](#pages-and-folders)

# The reader

**They know TypeScript, Node, npm and the basics of Docker. They do not know Monux, and they may not know every
framework it generates.** Traefik, Docker Compose profiles, Angular SSR or Let's Encrypt are new to many readers.
Explain such a term in one plain sentence where the page introduces it.

**They come with a task.** They want to start a new workspace, add an api, deploy to a server. Pages and sections are
named and ordered by those tasks, not by how the code of Monux is organized.

# The voice

**Say what is.** What the reader does, and what they get. Present tense, active voice.

**Short sentences.** One idea per sentence. A long sentence with three clauses is three sentences.

**Second person for the developer, third person for their users.** The developer is "you". The people using what
they build are "users", and a user is "they". Never "he" or "she".

**Name Monux only where the reader has to tell it apart from their own code or another tool.** "Generated for you"
says enough; "Monux generates it for you" says the same thing longer.

**Write it plainly.** No framing ("Two things have to be true"), no closing aphorism, no bold sentence in the middle of
a paragraph, no announcing that something matters. Do not call anything simple or easy: the reader decides that.

**A comparison is a one-line orientation.** "Monux uses npm workspaces where Nx has its own task runner" saves a
reader real time. Which tool does it better does not belong in the documentation.

## What stays out

**History.** Not what changed, not what something used to do, not "still", "any more", "now" or "today". A reader who
never saw the old version does not need it. The release notes are the one exception.

**How Monux works underneath.** Not which file Monux edits to set something up, not the regular expression it reads
`global-environment.model.ts` with. Describe what the reader gets and what they can change.

**References into the repository of Monux.** No test file, no source path. Link to a section, or name the command.

**What the reader will notice on their own.** A required prompt does not need a sentence saying the command stops
without it.

## Reasons

**One short sentence of why, when a rule would look arbitrary without it.** Never a paragraph. A decision that spans
many sections goes into [GOALS.md](./GOALS.md) and is linked.

## Warnings and limits

**Small, unsurprising and with small effects: a plain sentence**, right after the command or example it concerns.

**Detailed, or with heavy implications: an alert block.** Two kinds, nothing else:

```md
> [!WARNING]
> `.env` holds the secrets of every project. It is excluded from git; keep it that way.

> [!NOTE]
> `mx down` stops the services. Their containers and volumes stay.
```

`WARNING` is for what can hurt the reader: data loss, a security hole, something that fails silently. `NOTE` is for a
limit: what a feature covers and where it ends, phrased as what is.

## Words and punctuation

**American spelling.** Initialize, behavior, organization.

**Acronyms in their standard casing** in prose: SSL, SEO, HTTP, JSON, SQL, URL, CLI. Products as their owners write
them: Docker Compose, LoopBack, NestJS, WordPress, Let's Encrypt. Code, commands and file names stay in backticks
exactly as they are written: `mx up`, `.env.public`, `docker-compose.yaml`.

**No em dashes in prose.** Use a full stop, a colon or a comma. The one place an em dash stays is the separator in a
[See also](#see-also) list.

**No `<br>`, `<b>` or `<i>`.** A blank line starts a paragraph, and markdown has bold and italics.

**"Such as" or "for example"**, not "eg." or "e.g.".

# A page

Every page has the same parts, in this order:

1. `# Title`: the topic, in the reader's words
2. The intro paragraph
3. The sections, one per task, starting with setting it up when there is anything to set up
4. `## See also`

## The intro

**First what it is, then what it enables.** No scenario openers ("At some point you will probably…"), no "This page
explains…".

## Sections

**Headings name the task, as a gerund, in sentence case**: "Adding an api", "Deploying to a server", "Running a script
in every project". They are `##` directly under the page, with no "Usage" section around them.

**Headings are stable.** Other pages and assistants link to their anchors. Renaming one means fixing every link to it.

**Link a concept to the section that owns it** where it first comes up, with a relative link and the anchor.

## Commands

**Every command has a table of its forms**, with the aliases in the same row:

```md
| Command | What it does |
|---|---|
| `mx up`, `mx u` | Starts the services of the workspace in an environment you choose |
| `mx up <workspace>` | Starts the services of another workspace, from any directory |
```

## Prompt and option tables

**What a command asks is listed in a table**, so a reader knows the answers before they start:

```md
| Prompt | What it is |
|---|---|
| `Port` | The port of the api during development. 3000 by default |
| `Sub domain` | The sub domain the api is reached under. The root domain and `www` when left empty |
```

Each row ends with its default ("3000 by default") or with "Required".

## See also

```md
## See also
- [Environment variables](./environment.md) — the values every project reads
- [Deploying](./deploying.md) — running the workspace on a server
```

The pages a reader of this one goes to next, each with what they find there.

# Examples

**Every example works when copied.** A command runs as written in a workspace generated by the current version, and a
file compiles and passes the linter of that workspace.

**The first line of a file names it**, relative to the root of the workspace: `// apps/api/src/environment/environment.model.ts`.

**A comment in an example marks what the reader changes** (`// your own domain`). It never explains why and never
offers an alternative. Say that in the sentence before or after the block.

**Names are realistic.** Never `foo`, `test` or `my-app`. Where it is natural, draw them from the running example, a
shop:

| Name | What it is |
|---|---|
| `shop` | The workspace |
| `api` | The zibri api, on `api.example.com` |
| `admin` | The Angular app for the api, on `admin.example.com` |
| `website` | The Angular website, on `example.com` and `www.example.com` |
| `shared` | A Typescript library both use |
| `db` | The Postgres database of the api |

# Pages and folders

**One topic per page.** When two pages start carrying content that belongs to a third, write the third and link to it.

**Split a page by reader task.** When a section is something a reader does on a different day (deploying, adding a
project type by hand), it is a page of its own.

**Anything worth documenting is documented in the same change**, or written down as a TODO.
