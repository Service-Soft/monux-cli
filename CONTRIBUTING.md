# Contributing to Monux
Thank you for considering to contribute to this project!

It is open for discussion to change anything regarding contributing, linting, workflow etc. at any point in time.

All development is done using github.

# Table of Contents
- [Contributing to Monux](#contributing-to-monux)
- [Table of Contents](#table-of-contents)
- [Create an issue](#create-an-issue)
  - [Special Notes for bugs](#special-notes-for-bugs)
- [Writing code](#writing-code)
  - [Running the tests](#running-the-tests)
  - [Trying a change by hand](#trying-a-change-by-hand)
- [Workflow for submitting Code Changes](#workflow-for-submitting-code-changes)
- [Releasing](#releasing)
- [License](#license)

# Create an issue
If you want to ask a question, need a new feature, found gaps in the documentation, found a bug, found code that can be refactored etc. you first have to start with creating an Issue.

Please check if there already is an issue for your problem.

Right now there are no specific guidelines for Issues, other than that their name and description should include enough details so that everyone knows what the issue is about.

## Special Notes for bugs
Great Bug Reports tend to have:

- A quick summary
- Steps to reproduce (be specific and try to give sample code if possible)
- What you expected would happen
- What actually happens
- The version of Monux (`mx v`), Node and Docker you are using
- Additional info (eg. why you think this might be happening, or workarounds you tried that did/did not work)

# Writing code
Read [CODE_STYLE.md](./CODE_STYLE.md) before your first change. It covers the conventions this repository follows for naming, files, generated code, types, comments, output and tests. Before you change what a project type generates, also read [GOALS.md](./GOALS.md) and the `GOALS.md` of that project type. Before you write or change documentation, read [DOCS_STYLE.md](./DOCS_STYLE.md).

## Running the tests
The tests generate real workspaces, so they need what a user of Monux needs:

- Node 24 or newer
- Docker with Docker Compose, running
- The clis Monux runs, installed globally in the versions `.github/workflows/ci.yml` installs:
  `npm i -g @angular/cli@20 zibri-cli @loopback/cli@7 @nestjs/cli@12 create-vite@6 create-storybook@9.1.20`

Then:

1. `npm run build`, which also checks the types of the tests
2. `npm run lint`
3. `npm test`, which runs every suite in band. `npm test -- src/commands/down` runs one directory

Each suite generates its workspace into `src/__testing__/tmp/<name>`, which you can open after a run to see what was generated.

## Trying a change by hand
`npm start -- <command>` builds Monux and runs it inside `sandbox/`, such as `npm start -- add`. `npm run clear` empties the sandbox and initializes a new workspace in it.

# Workflow for submitting Code Changes
1. Create an issue if it not already exists.
2. Create a branch for that specific issue (The best way to this is directly inside the issue on the right side under "Development". That way the issue and the branch are automatically linked)
3. Checkout the new branch
4. Add your code
5. Update / add tests.
6. Update the documentation.
7. Check that the build, linting and tests pass, see [Running the tests](#running-the-tests).
8. Rebase to dev and solve any merge-conflicts (`git rebase dev`)
9. Issue that pull request into dev!

# Releasing
1. Set the new `version` in `package.json` on dev.
2. Merge dev into `release` with a pull request.

The `CD` workflow then builds Monux and publishes it to npm.

# License
By contributing to this project, you agree that your contributions will be licensed under its MIT License.
