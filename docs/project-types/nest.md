# NestJS

A NestJS api is a backend of the workspace built on [NestJS](https://nestjs.com) with TypeORM, and a Postgres or
MariaDB database. It is a NestJS project as `nest new` generates it, with its database and its configuration from the
workspace, and it documents its routes with OpenAPI. Auth, logging and the rest are yours to add the NestJS way.

> [!NOTE]
> The [Angular app](./angular-app.md) of Monux is built for zibri. `mx add` does not generate an app for a NestJS
> api.

## Adding a NestJS api

Run [`mx add`](../projects.md#adding-a-project-with-mx-add) and choose the type `nest`.

| Prompt | What it is |
|---|---|
| `Port` | The port of the api in development. 3000 by default |
| `Sub domain` | The sub domain the api is reached under, such as `api`. The root domain and `www` when left empty |

[The database prompts](../projects.md#choosing-the-database) follow, with the type of the database.

The api is in `apps/<name>`. Its service is in `local.docker-compose.yaml`, `stage.docker-compose.yaml` and
`docker-compose.yaml`.

| Script | What it does |
|---|---|
| `npm run build` | Builds the api |
| `npm run start:dev` | Starts the api and restarts it whenever you change its code |
| `npm test` | Runs its tests |
| `npm run lint` | Lints it |

## Running a NestJS api in development

Start the database with `mx up` and the environment `dev`, then the api with `mx api start:dev`. It is reached on
`http://localhost:3000`, and the documentation of its routes on `http://localhost:3000/api`.

In development, TypeORM changes the schema of the database to follow the entities. The other environments leave the
schema as it is.

> [!WARNING]
> Set up [migrations](https://docs.nestjs.com/techniques/database#migrations) before the database of stage or
> production holds data. Without them, a new entity or column has no table there.

## See also

- [NestJS](https://docs.nestjs.com) — the documentation of NestJS
- [Databases](../databases.md) — the database of the api
- [Zibri](./zibri.md) — the api the Angular app is built for
