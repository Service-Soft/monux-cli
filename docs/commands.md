# Commands

Every command of `mx`, with its aliases, and the page that explains it. `mx help` lists them in the terminal.

## Working with the workspace

| Command | What it does |
|---|---|
| `mx init`, `mx i` | Initializes a workspace in the current directory, see [Creating a workspace](./workspace.md#initializing-a-workspace) |
| `mx add`, `mx a` | Adds a project to the workspace, see [Adding a project](./projects.md#adding-a-project-with-mx-add) |
| `mx prepare`, `mx p` | Validates the environment and writes the `environment.ts` of every app and the scripts of the databases, see [Environment variables](./environment.md#reading-values-in-a-project) |

> [!NOTE]
> When `mx init`, `mx add`, `mx prepare`, `mx generatePage` or `mx generateComponent` is interrupted or fails, the
> files of the workspace are restored as they were before it, and the projects it generated are removed.
> `node_modules` is kept as it is, so it may hold packages the command installed; `npm install` removes them.

## Running the services

| Command | What it does |
|---|---|
| `mx up`, `mx u` | Runs `mx prepare`, then builds and starts the services of an environment, see [Starting the services](./running.md#starting-the-services) |
| `mx up <workspace>` | Starts the services of another workspace, from any directory |
| `mx down`, `mx d` | Stops the running services, see [Stopping the services](./running.md#stopping-the-services) |
| `mx down <workspace>` | Stops the running services of another workspace, from any directory |
| `mx list`, `mx ls` | Lists the workspaces with running services, see [Listing the workspaces](./running.md#listing-the-workspaces) |
| `mx list-all`, `mx la` | Lists every workspace with services, running or stopped |

## Generating code

| Command | What it does |
|---|---|
| `mx generatePage`, `mx gp` | Adds a page to a website, see [Adding a page](./project-types/angular-website.md#adding-a-page) |
| `mx generateComponent`, `mx gc` | Adds a component to an Angular library, see [Adding a component](./project-types/angular-library.md#adding-a-component) |

## Running scripts

| Command | What it does |
|---|---|
| `mx <project> <script>` | Runs an npm script of a project, see [Running a script of a project](./running.md#running-a-script-of-a-project) |
| `mx <project> install <package>` | Installs a package into a project. `i`, `uninstall` and `rm` work the same |
| `mx run-all <script>`, `mx ra <script>`, `mx run-many <script>` | Runs an npm script in every project that has it, see [Running a script in every project](./running.md#running-a-script-in-every-project) |

## Getting help

| Command | What it does |
|---|---|
| `mx help`, `mx h` | Lists the commands |
| `mx version`, `mx v` | Shows the version of Monux |

## See also

- [Creating a workspace](./workspace.md) — where to start
- [Running the workspace](./running.md) — the environments and their services
