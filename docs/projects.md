# Adding a project

`mx add` generates a project into the workspace and makes it part of it: its services in the Docker Compose files,
its values in the environment, its database initialized. Each project stays a normal project of its framework, built,
linted and tested with the tools of that framework.

## Adding a project with mx add

| Command | What it does |
|---|---|
| `mx add`, `mx a` | Adds a project to the workspace, asking for its type and name first |

| Prompt | What it is |
|---|---|
| `type` | The project type, see [Project types](#project-types). Required |
| `name` | The name of the project, which is also its folder and its compose service, such as `api`. Required |

The prompts of the project type follow. Every project type that has a database asks
[the database prompts](#choosing-the-database) last.

When `mx add` is interrupted, such as with Ctrl+C, or fails, the workspace is restored as it was before it. See
[Commands](./commands.md#working-with-the-workspace).

## Project types

| Type | What it is | Folder |
|---|---|---|
| `zibri` | [A zibri api](./project-types/zibri.md): the backend, with its database, auth and entities | `apps/<name>`, and its contract library in `libs/<name>-contract` |
| `angular` | [An Angular app](./project-types/angular-app.md) for a zibri api, such as its admin | `apps/<name>` |
| `angular-website` | [An Angular website](./project-types/angular-website.md), prerendered, with SEO and consent for tracking | `apps/<name>` |
| `angular-library` | [An Angular library](./project-types/angular-library.md) of components the Angular projects share | `libs/<name>` |
| `ts-library` | [A TypeScript library](./project-types/typescript-library.md) of code several projects share | `libs/<name>` |
| `loopback` | [A LoopBack api](./project-types/loopback.md) with a Postgres database | `apps/<name>` |
| `nest` | [A NestJS api](./project-types/nest.md) with TypeORM and a Postgres or MariaDB database | `apps/<name>` |
| `wordpress` | [Wordpress](./project-types/wordpress.md) with a MariaDB database | No folder: a service of the compose files |

The generated Angular app, the `@service-soft` libraries and zibri are built for each other. Add a zibri api first
when the product needs an app.

## Choosing the database

The apis and Wordpress ask where their database is:

| Prompt | What it is |
|---|---|
| `Database compose service` | `NEW` for a database service of its own, or an existing database service of the workspace to share. Only services of the type the project uses are offered. `NEW` by default |
| `Database name` | The name of the database of the project. The name of the project by default |
| `database type` | `postgres` or `mariadb`. Only NestJS asks it, for a new service: zibri and LoopBack use Postgres, Wordpress MariaDB. `postgres` by default |
| `Compose service name` | The name of the new database service, such as `db`. Only for a new service. `db` by default |

A shared database service gets one more database and user for the project. See [Databases](./databases.md).

## Adding a project by hand

Every framework can be part of a workspace without `mx add`:

1. Put an app into `apps/<name>` or a library into `libs/<name>`, with a `package.json` of its own. npm finds it
   through the workspaces of the root `package.json`.
2. Let its `tsconfig.json` extend `../../tsconfig.base.json`, and its `eslint.config.mjs` the one of the root.
3. For an app that reads values of the environment, add `src/environment/environment.model.ts`, see
   [Reading values in a project](./environment.md#reading-values-in-a-project).
4. Add its service to the compose files of the environments it runs in, with the labels of traefik if it is reached
   from outside. A service `mx add` generated is the example to copy.

Run `mx prepare` afterwards to write its `environment.ts`.

The Docker image of an app is built from the root of the workspace, so that `npm ci` sees the lockfile of the
workspace. A library of the workspace is a symbolic link in `node_modules`, so the image copies the library itself
and builds it before the app:

```dockerfile
# apps/search/Dockerfile
FROM node:24-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/search/package.json apps/search/package.json
COPY libs/shared/package.json libs/shared/package.json
RUN npm ci --workspace apps/search --workspace libs/shared
COPY tsconfig.base.json ./
COPY libs/shared libs/shared
COPY apps/search apps/search
RUN npm run build --workspace libs/shared && npm run build --workspace apps/search

FROM node:24-slim
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/libs/shared libs/shared
COPY --from=build /workspace/apps/search apps/search
USER node
WORKDIR /workspace/apps/search
CMD ["node", "dist/index.js"]
```

Next to it, `apps/search/Dockerfile.dockerignore` keeps what your machine built out of the image:

```text
# apps/search/Dockerfile.dockerignore
**/node_modules
**/dist
.git
**/.env
```

The compose service builds it with the root as its context:

```yaml
# docker-compose.yaml
services:
    search:
        build:
            dockerfile: ./apps/search/Dockerfile
            context: .
```

## See also

- [Project types](#project-types) — what each type generates
- [Environment variables](./environment.md) — the values a project reads
- [Databases](./databases.md) — the databases and users a database service starts with
