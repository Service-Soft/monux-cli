# Goals of Monux

What Monux is for, and what every change to it is measured against. Each project type adds goals of its own in the
`GOALS.md` next to its command:

| Project type | Goals |
|---|---|
| Angular app | [add-angular/GOALS.md](./src/commands/add/add-angular/GOALS.md) |
| Angular website | [add-angular-website/GOALS.md](./src/commands/add/add-angular-website/GOALS.md) |
| Angular library | [add-angular-library/GOALS.md](./src/commands/add/add-angular-library/GOALS.md) |
| Typescript library | [add-ts-library/GOALS.md](./src/commands/add/add-ts-library/GOALS.md) |
| Zibri | [add-zibri/GOALS.md](./src/commands/add/add-zibri/GOALS.md) |
| LoopBack | [add-loopback/GOALS.md](./src/commands/add/add-loopback/GOALS.md) |
| Nest | [add-nest/GOALS.md](./src/commands/add/add-nest/GOALS.md) |
| Wordpress | [add-wordpress/GOALS.md](./src/commands/add/add-wordpress/GOALS.md) |

# The goals

**Nothing is hidden from the developer.** A workspace is npm workspaces, Docker Compose files and the projects in
`apps/` and `libs/`, each one a normal project of its framework. Every file Monux generates is code the developer can
read and change. What Monux does on top, validating and writing the environment files and initializing databases, is
documented, and its inputs are files in the workspace.

**A generated workspace works on the first try.** Right after `mx init` and `mx add`, every project builds, passes its
linter with zero warnings, passes its own tests and starts with `mx up` in every environment: dev, local, stage and
prod. A developer who has to fix generated code before they can start has found a bug of Monux.

**Projects that belong together work together.** An Angular app added for a zibri api logs in, shows entities and
change sets and logs errors against it, with no manual wiring. The `@service-soft` libraries are built for zibri, so
zibri is the api the app is generated for.

**What every workspace needs lives in a library.** Generated code is thin: names, domains, environment, and the code
the developer is expected to change. Everything else is in zibri or the `@service-soft` libraries, so a workspace gets
fixes and features by updating packages, not by being generated again.

**Defaults are opinionated, and removable.** Monux sets up auth, tracking with consent, offline sync, SEO files and
more, because most projects need them. The developer owns the result: each of these can be removed in one place
without anything else breaking.

**Deploying is one command.** `mx up` builds and starts the whole workspace with Docker Compose, behind traefik, with
certificates from Let's Encrypt in production. Local runs the production build on the developer's machine, and stage
runs it with basic auth in front.

**Configuration is typed, in one place.** Every value lives in the root `.env` and `.env.public`, typed in
`global-environment.model.ts`. Each project declares the keys it needs and gets a typed `environment.ts` with only
those, so a secret of the api never reaches a website.

# How it is held

- **The tests generate workspaces for real**, with the real clis, and build, lint and test what they generated. See
  [Tests](./CODE_STYLE.md#tests).
- **The code style of each framework applies to what Monux generates for it.** See
  [Generated code](./CODE_STYLE.md#generated-code).

# Changing it

**Judge a change by the goals it touches.** Say which goals it works towards. A change that works against one, even a
little, is not made until this file or the goals of the project type say it may.

**A new goal, or a goal given up, changes the goals file first.** That is a decision for the maintainer, not an
implementation detail. Write it down here before you build it.

**A goal comes with how it is checked.** Add the check to "How it is held" of the file it belongs to.

# Decided against

What Monux does not do, and why, so it is not proposed again without a new reason.

- **Its own build system or task runner**, like Nx. The abstraction is convenient as long as everything works and
  makes every problem harder to debug. Monux uses npm workspaces and the clis of each framework as they are.
- **Hiding generated code behind a runtime of Monux.** No project of a workspace imports Monux. What Monux adds is
  files the projects read, like the generated `environment.ts`.
