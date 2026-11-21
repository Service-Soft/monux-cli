# Running the workspace

`mx up` starts the services of the workspace with Docker Compose in one of its
[environments](./workspace.md#the-environments), and `mx down` stops them. In development the databases run in
Docker and the projects on your machine, with their own dev servers. `mx` also runs the npm scripts of one project or
of every project from the root of the workspace.

## Starting the services

| Command | What it does |
|---|---|
| `mx up`, `mx u` | Starts the services of the workspace in the environment you choose |
| `mx up <workspace>` | Starts the services of another workspace that ran before, from any directory |

| Prompt | What it is |
|---|---|
| `env` | The environment: `dev`, `local`, `stage` or `prod`. Required |

`mx up` first runs [`mx prepare`](./environment.md#reading-values-in-a-project), which validates the environment and
writes the files the projects read. Then it builds the images and starts the containers, in the background:

```sh
docker compose -f <compose file> -p <workspace> --env-file .env --env-file .env.public up --build -d
```

## Running in development

1. Start the databases with `mx up` and the environment `dev`.
2. Start each project you work on with its own dev server, such as `mx api start` and `mx admin start`, each in a
   terminal of its own.

A project is then reached on `http://localhost:<port>`, with the port from its prompt in `mx add`, such as
`http://localhost:4200` for the app. It reloads when you change its code.

[Adminer](./databases.md#looking-into-a-database-during-development) is on `http://localhost:8080`.

## Running the production build locally

`mx up` with the environment `local` starts every project from its production image, behind traefik, the way stage
and production run it. Use it to check a website with Lighthouse, or an image before you deploy it. A project is
reached on `http://<sub domain>.localhost`, such as `http://admin.localhost`, and one without a sub domain on
`http://localhost`.

> [!NOTE]
> The image of a zibri api only starts once its `versions` folder records the version it runs. Start the api once in
> development before, see [Recording the version of a zibri api](./project-types/zibri.md#recording-the-version).
> `mx up` refuses to start the images until then.

## Stopping the services

| Command | What it does |
|---|---|
| `mx down`, `mx d` | Stops the running services of the workspace |
| `mx down <workspace>` | Stops the running services of another workspace, from any directory |

> [!NOTE]
> `mx down` stops the containers, like `docker compose stop`. The containers and their volumes stay, and so does the
> data of the databases.

## Listing the workspaces

| Command | What it does |
|---|---|
| `mx list`, `mx ls` | Lists the workspaces with running services, and their services |
| `mx list-all`, `mx la` | Lists every workspace with services, running or stopped |

Each workspace is a table of its services: its name, its image, its status, such as `Running (2 hours)`, and its
environment. A workspace is listed once `mx up` has started it.

## Running a script of a project

| Command | What it does |
|---|---|
| `mx <project> <script>` | Runs an npm script of a project in `apps/` or `libs/`, such as `mx api build` |
| `mx <project> install <package>` | Installs a package into a project, such as `mx admin install date-fns`. `i`, `uninstall` and `rm` work the same |

Everything after the name of the script is passed to the script, not to npm.

## Running a script in every project

| Command | What it does |
|---|---|
| `mx run-all <script>`, `mx ra <script>`, `mx run-many <script>` | Runs an npm script in every project that has it, such as `mx run-all lint` |

## See also

- [The environments](./workspace.md#the-environments) — what runs where
- [Deploying](./deploying.md) — running stage and production on a server
- [Commands](./commands.md) — every command of `mx`
