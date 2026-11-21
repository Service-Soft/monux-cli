# Creating a workspace

A workspace is one git repository with every project of a product in it: the apis in `apps/`, the websites and apps
in `apps/`, the libraries they share in `libs/`. It is an npm workspace with Docker Compose files that start all of it
in development, on your machine and on a server.

## Initializing a workspace

Run `mx init` in an empty directory. The name of the directory becomes the name of the workspace.

| Command | What it does |
|---|---|
| `mx init`, `mx i` | Initializes a workspace in the current directory |

| Prompt | What it is |
|---|---|
| `prod root domain (eg. "test.com")` | The domain of production, such as `example.com`. Required |
| `stage root domain (eg. "test-staging.com")` | The domain of stage, such as `example-staging.com`. Required |
| `E-Mail (needed for ssl certificates)` | The email Let's Encrypt sends notices about the certificates to. Required |
| `Setup Github Actions?` | Whether to add a workflow that lints and tests every project on every push. Yes by default |

```sh
mkdir shop
cd shop
mx init
```

## What a workspace holds

| File or folder | What it is |
|---|---|
| `apps/` | The projects that run: apis, websites, apps and Wordpress |
| `libs/` | The libraries the projects share |
| `package.json` | The root of the npm workspace, with `apps/*` and `libs/*` as its workspaces |
| `mx.workspace.json` | The name of the workspace and the type of every project added with `mx add` |
| `.env` | The secret values of every project. Excluded from git |
| `.env.public` | The values that may be committed, such as the domains |
| `global-environment.model.ts` | The types of every value of `.env` and `.env.public`, see [Environment variables](./environment.md) |
| `dev.docker-compose.yaml` | The services of [development](./running.md#running-in-development): databases and adminer |
| `local.docker-compose.yaml` | Every project from its Docker image, on your machine, see [Running the production build locally](./running.md#running-the-production-build-locally) |
| `stage.docker-compose.yaml` | Every project on the stage server, with basic auth in front, see [Deploying](./deploying.md) |
| `docker-compose.yaml` | Every project on the production server, see [Deploying](./deploying.md) |
| `databases/` | The databases and users each database service starts with, see [Databases](./databases.md) |
| `tsconfig.base.json` | The TypeScript configuration every project extends |
| `eslint.config.mjs` | The lint configuration every project extends, from `@service-soft/eslint-config` |
| `cspell.words.txt` | The words the spell check of the linter accepts |
| `theme.css` | The colors, fonts and sizes every Angular project of the workspace shares, as Tailwind CSS tokens |
| `.github/workflows/main.yml` | Installs, lints and tests every project on every push, when chosen |

> [!WARNING]
> `.env` holds the secrets of every project. It is excluded from git; keep it that way.

## The environments

Every service of the workspace runs in one of four environments. You choose one when you run
[`mx up`](./running.md#starting-the-services):

| Environment | Compose file | What runs | Where a project is reached |
|---|---|---|---|
| `dev` | `dev.docker-compose.yaml` | The databases, adminer and Wordpress. The other projects run on your machine with `npm start` | `http://localhost:<port>` |
| `local` | `local.docker-compose.yaml` | Every project from its production image, behind traefik | `http://<sub domain>.localhost` |
| `stage` | `stage.docker-compose.yaml` | The same on a server, with HTTPS and basic auth in front of the websites and apps | `https://<sub domain>.<stage root domain>` |
| `prod` | `docker-compose.yaml` | The same on a server, with HTTPS | `https://<sub domain>.<prod root domain>` |

[Traefik](https://doc.traefik.io/traefik/) is the reverse proxy in front of the services: it routes each request to
the service of its domain and gets the certificates from Let's Encrypt. A project without a sub domain is reached
under the root domain and its `www`, which redirects to the root domain.

## See also

- [Adding a project](./projects.md) — the project types `mx add` generates
- [Environment variables](./environment.md) — the values every project reads
- [Running the workspace](./running.md) — starting, stopping and listing the services
