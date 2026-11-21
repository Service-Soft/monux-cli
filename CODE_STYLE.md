# Code style

Conventions for this repository. Read this before your first change.

Changing what a project type generates? Read [the goals of Monux](./GOALS.md) and the `GOALS.md` next to that
project type's command first (such as [the website's](./src/commands/add/add-angular-website/GOALS.md)): they are what
every change to it is measured against.

Where this and the surrounding code disagree, this wins — the code predates some of it. Where this
and the linter disagree, the linter wins and this file is wrong; open an issue.

# Table of Contents

- [Code style](#code-style)
- [Table of Contents](#table-of-contents)
- [The linter decides most of it](#the-linter-decides-most-of-it)
- [Goals](#goals)
- [Naming](#naming)
  - [A function's verb says what it costs to call it.](#a-functions-verb-says-what-it-costs-to-call-it)
  - [Names should be precise](#names-should-be-precise)
- [Files](#files)
- [Shape of the code](#shape-of-the-code)
- [Node and third-party packages](#node-and-third-party-packages)
- [Generated code](#generated-code)
- [Types](#types)
- [Comments and JSDoc](#comments-and-jsdoc)
- [Output and messages for the user](#output-and-messages-for-the-user)
- [The documentation](#the-documentation)
- [Tests](#tests)

# The linter decides most of it

Casing, import order, line length, member ordering and required JSDoc are all rules, not prose.
Run `npm run lint` and `npm run build` before you open a pull request. The build is what checks the
types, the tests' included.

**Warnings are errors.** Linting runs with `eslint --max-warnings=0`, so there is no such thing as a
warning you can leave behind.

If a rule fires, try to fix the code — enumerate the missing switch cases, write the missing JSDoc,
narrow the type. A rule that genuinely needs to be disabled should always be the last resort.

Nothing the linter already checks is repeated below.

# Goals

**Every change is checked against the goals it touches.** [GOALS.md](./GOALS.md) holds the goals of Monux as a whole,
and every project type has a `GOALS.md` next to its command in `src/commands/add/`. Before you build something, say
which goals it works towards. A change that works against one is not a trade-off to make on your own: the goals
change first, and that is a decision for the maintainer.

**A new goal comes with how it is checked.** A goal nothing checks is a wish. Where it can be measured, such as a
payload size or a Lighthouse score, a test measures it.

# Naming

## A function's verb says what it costs to call it.

| Verb | Use it when |
|---|---|
| `getX` | The value is already there and you are handing it over |
| `findX` / `findXs` | You are looking for it, and it may not be there |
| `resolveX` | Work happens before you can answer — a lookup, a computation, reading a file, running a process |
| `validateX` | You are checking something, and the caller learns nothing except that it was wrong |

`getX` and `resolveX` divide on effort, not on where the value lives. A getter that reads a file or
runs `docker compose ps` is a `resolveX`, however cheap it looks from the outside.

**`validateX` is the only verb for checking.** Not `assertX`, not `requireX`, not `ensureX`, not
`checkX` — they all describe the same function, one that returns nothing and throws (or exits) when
it has something to say, and several names for it means nobody can search for the checks.

## Names should be precise
Always prefer `createDockerfile` over `create`. The only restriction to this is when the function is already grouped by something:

`DockerUtilities.createDockerComposeFile` is unnecessary verbose, here it should be `DockerUtilities.createComposeFile`.

# Files

**One exported concept per file**, named after it in kebab-case, with a suffix saying what kind of
thing it is:

| Suffix | Holds |
|---|---|
| `.command.ts` | A cli command, such as `mx up` or the `mx add` of one project type |
| `.model.ts` | A class or type describing data — a configuration, the shape of a file Monux reads or writes |
| `.utilities.ts` | A class of related static methods |
| `.function.ts` | A single exported function that belongs to no class |
| `.questions.ts` | The prompts of one step, as `QuestionsFor` |
| `.enum.ts` | An enum |
| `.type.ts` | A standalone type alias |
| `.test.ts` | Tests for the file of the same name: `down.command.test.ts` tests `down.command.ts` |
| `.mock.ts` | A helper of the tests in `src/__testing__` |

**A test sits next to what it tests.** `down.command.ts` and `down.command.test.ts` share a directory.

**A project type lives in `src/commands/add/add-<type>/`**: its command and its `GOALS.md`. What it generates lives
in `templates/`, see [Generated code](#generated-code).

# Shape of the code

**Group related functions into a utility class with static methods**, not a directory of loose
exports. Put the entry points first and the steps they are built from below as `private static`. A
standalone `.function.ts` is for something that genuinely belongs to no group — and when a second one
appears next to it, they become a class. `toKebabCase`, `toPascalCase` and `toSnakeCase` are one
class, not three files.

**Extend an existing helper rather than adding a sibling.** Search `src/encapsulation/`, `src/utilities/` and the
directory of the tool you are working with (`src/angular/`, `src/docker/`, `src/env/`, …) for the concept before you
design anything. Most of what a change needs already exists: `FsUtilities.replaceInFile`,
`NpmUtilities.updatePackageJson`, `DockerUtilities.addServiceToCompose`, `EnvUtilities.buildEnvironmentFileForApp`.

**A command validates, resolves its input, then runs.** Every command extends `BaseCommand`, which calls
`validate`, `resolveInput` and `run` in that order. Questions are asked in `resolveInput` (or `getConfig` of an add
command), so `run` works with a complete, typed configuration and asks nothing.

**Run independent steps together.** Steps of a generator that do not read what another one writes run in one
`Promise.all`, as `AddZibriCommand.run` does. A step that edits a file another step creates runs after it.

**Fix the cause.** A guard that hides a wrong value, a retry around something that should not fail, a
longer timeout around something that got slower — each leaves the defect in place and adds a thing to
maintain. If the real fix is out of scope, say so and leave the problem visible.

**When a setting has two legitimate answers, ask for it.** No silent default for a choice the user
has to live with, such as the database type or whether a website tracks. A prompt asks once, in the
one place it can be answered. A default value in the prompt is fine; one the user never sees is not.

**Touch only what your change needs.** Do not reformat, rename or improve adjacent code. Remove
imports and variables *your* change orphaned; leave pre-existing dead code alone and mention it.

# Node and third-party packages

**Only `src/encapsulation/` imports Node's built-ins and third-party packages**, apart from the tools only the tests
use, like playwright, which the helpers in `src/__testing__/` import. That includes their types: a wrapper
re-exports what the rest of the code needs, such as `Dirent`. `FsUtilities` is the file system, `PathUtilities` builds
paths, `CPUtilities` runs processes, `ProcessUtilities` ends Monux, `InquirerUtilities` asks questions, `LogUtilities`
writes output and `YamlUtilities` reads and writes yaml. The tests replace exactly these boundaries, so code that goes
around them cannot be tested the same way, and a package can be replaced in one place.

A package that has no wrapper yet gets one.

**Every dependency needs a reason.** Say it in the pull request. Monux is installed globally on the machines of its
users, so what it depends on is installed with it.

# Generated code

What Monux writes into a workspace becomes code the developer owns. It is held to the standards of the project it
lands in, not to the ones of this repository.

**Generated files are real files in `templates/<name>/`**, laid out the way they land in the project, and
`TemplateUtilities.write` copies them there. A value that differs per workspace is a placeholder, `{{=name}}`, in the
content or the path of a file; `write` fails on a placeholder it is not given and on one the template does not use, so
a template and its caller cannot drift apart. Keep placeholders to names, domains and ports: the rest of a template is
the same in every workspace, and is read and changed as the code it is. `templates/` is not linted here, as its
placeholders are no valid code; the tests lint it in the workspaces they generate.

**It follows the code style of the framework it is written for.** Code for a zibri api follows
[zibri's CODE_STYLE.md](https://github.com/Service-Soft/zibri/blob/release/CODE_STYLE.md), Angular code follows
[the one of angular-libraries](https://github.com/Service-Soft/angular-libraries/blob/release/CODE_STYLE.md): signals,
`inject()`, no `@angular/material`, Tailwind with the tokens of `@service-soft/ui`. Read the one that applies before you
change a template; they are linked rather than copied so they cannot drift.

**It passes `@service-soft/eslint-config` with zero warnings, and builds.** A template that only works after the
developer fixes it is a bug of Monux, and the tests check it, see [Tests](#tests).

**What every workspace needs belongs in a library, not in a template.** A generated file cannot be updated once it is
written, a package can. Before you add logic to a template, check whether it belongs in zibri or one of the
`@service-soft` libraries, and keep the template to what is specific to this workspace: its names, its domains, its
environment.

**The generated project is the developer's.** Every opinionated default, such as tracking or the offline sync, is
something they can remove in one place without anything else breaking.

**Edits to a framework's own output are kept small and exact.** Monux runs `ng new`, `zi new` and the other clis, then
changes what they wrote. Each edit replaces a specific, known piece of text with `FsUtilities.replaceInFile` or
updates a file through its model, such as `NpmUtilities.updatePackageJson`, and fails when that text is not there: a
cli that changed its output then breaks a test instead of a workspace.

**The versions Monux installs are pinned in one place.** A cli Monux runs through `npx` names its exact version, such as
`ZibriUtilities.CLI_VERSION`, so a workspace generated today is the workspace the tests generated.

# Types

**Be strict.** No implicit `any`, no widening a type to make a call compile. If a type is genuinely
unknown, it is `unknown`.

**`as SomeType` means the model is wrong.** Before writing a cast, find the shape that does not need
one — usually a type that was never split.

**`as never` is never the answer, least of all in a test.** A cast in a test means the test data does
not match what the code takes, which is the thing worth knowing.

**Before replacing an `any`, find out why it is there.** Some are load-bearing. Report what would make
the reason obsolete rather than substituting `unknown` and seeing whether it compiles.

**Prefer a named type to an inline one**, and declare the type of every non-trivial local.

**A file Monux reads or writes has a model.** `AngularJson`, `PackageJson`, `ComposeDefinition` and `TsConfig` describe
those files, and the code edits them through it rather than through strings.

# Comments and JSDoc

These are different audiences and the split is strict.

**JSDoc says what.** What the thing does and what a caller gets, for whoever uses it next. It never names a past bug.

**Inline `//` comments are where the reasoning goes.** Why this approach and not the obvious one, what was tried and
failed, which invariant a line is holding up, which output of which cli an edit depends on. Write them for whoever has
to change this in a year.

**A comment in generated code is for the developer who owns the workspace.** It says what they are expected to change
(`// TODO: Provide the roles of your application`), never how Monux generated it.

Comment density matches the surrounding file. A comment restating the code is noise; a comment
explaining a decision is the most valuable line on the screen.

# Output and messages for the user

**All output goes through `LogUtilities`**, the only place that uses `console`. Commands say what kind of message it
is (`step`, `success`, `warning`, `error`, `heading`, `text`) and it decides how it looks, so every command looks the
same. `ProcessUtilities.exitWithError` reports an error and stops Monux.

**A step is announced in the -ing form, in sentence case, without a full stop**: `Creating the Angular workspace`,
`Setting up tailwind`. One line per step the user would recognize, not one per file.

**A result names what happened and where**: `Added "admin" in apps/admin`. Paths are relative to the root of the
workspace.

**An error says what went wrong and what to do about it.** `Could not find any running docker services for "shop"`
is followed by what the user can do: `Run mx ls to see the workspaces and their services`. A stack trace is for errors
Monux did not expect.

**A command the user can run is shown as they would type it**, highlighted with `ChalkUtilities.exampleUsage`.

**A prompt names the value it asks for, in sentence case**: `Port`, `Sub domain`, `Email of the default user`. No
question mark, no colon: the prompt adds its own.

**A validation message says what the value needs to be.** It is only read when the value is not that,
so a rule stated as a fact is false for the one value it is shown for. "A password has at least 12
characters" is what the password does not do; "The password needs to be at least 12 characters long" is
what its author has to change.

**"needs to" is the one wording of a requirement.** Not "has to", "should" or "must", and not the plain present
("The port is a number").

**A fact about what was refused stays a fact**, as long as it is true of that value: `is required`,
`The project "admin" does not exist`.

# The documentation

The [README](./README.md) is for people using Monux, and it follows [DOCS_STYLE.md](./DOCS_STYLE.md). Read it before you
write or change documentation.

Anything worth documenting is documented in the same change, or written down as a TODO. A change to what `mx add`
generates also updates the section of its project type.

# Tests

**Test the whole thing working, not each piece alone.** Bugs live between the parts, and between Monux and the clis
it runs. A command test runs the command for real: the real `ng new`, `zi new` and `docker compose`, in a workspace of
its own. Focused unit tests are right for genuinely pure logic — add them as well, not instead.

**A generator test checks what was generated.** Not that the command did not throw: the files it promised exist with
the content it promised, and `GeneratedProjectUtilities.validate` builds the generated project, lints it with zero
warnings and runs its own tests. That is what a developer runs right after `mx add`, so it is what the test runs.

**A goal that can be measured has a test that measures it**, on the generated project, see [Goals](#goals).

**Use the least mocking you can.** The prompts are the boundary: `InquirerUtilities['inquire'] = jest.fn(inquireMock({ ... }))`
answers them. Everything else runs for real. When a real dependency breaks under the test tooling, fix the tooling:
a mock permanently diverges the test from what ships.

**Every test works in a workspace of its own.** `getMockConstants('<unique name>')` gives it a directory under
`src/__testing__/tmp/`, and `FileMockUtilities.setup` creates the files of an initialized workspace there. Extend
`FileMockUtilities` and `getMockConstants` for a file a test needs, rather than writing it in the test.

**Timeouts come from the constants in `src/__testing__/mock/constants.ts`**, such as `MAX_ADD_TIME` or
`MAX_FAST_TIME`, so a test states how slow it is allowed to be rather than how slow it happened to be.

**Never record a bug as an accepted difference.** Tests exist to show bugs; a suite that is never red
is not a suite that is passing. Leave it red and report it.

**The tests need Docker and the clis Monux runs**, see [CONTRIBUTING.md](./CONTRIBUTING.md#running-the-tests).
`npm test` runs everything in band; `npm test -- src/commands/down` runs one directory.
