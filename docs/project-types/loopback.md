# LoopBack

A LoopBack api is a backend of the workspace built on [LoopBack 4](https://loopback.io), with a Postgres database. It
is a LoopBack project as `lb4 app` generates it, with its database and its configuration from the workspace. Auth,
logging and the rest are yours to add the LoopBack way.

> [!NOTE]
> The [Angular app](./angular-app.md) of Monux is built for zibri. `mx add` does not generate an app for a LoopBack
> api.

## Adding a LoopBack api

Run [`mx add`](../projects.md#adding-a-project-with-mx-add) and choose the type `loopback`.

| Prompt | What it is |
|---|---|
| `Port` | The port of the api in development. 3000 by default |
| `Sub domain` | The sub domain the api is reached under, such as `api`. The root domain and `www` when left empty |

[The database prompts](../projects.md#choosing-the-database) follow. A LoopBack api uses Postgres.

The api is in `apps/<name>`. Its service is in `local.docker-compose.yaml`, `stage.docker-compose.yaml` and
`docker-compose.yaml`. Its image updates the schema of the database with the migrate script of LoopBack before it
starts the api.

| Script | What it does |
|---|---|
| `npm run build` | Builds the api |
| `npm start` | Starts the built api |
| `npm test` | Runs its tests |
| `npm run migrate` | Updates the schema of the database to the models |
| `npm run openapi-spec` | Writes the OpenAPI specification of the api |
| `npm run lint` | Lints it |

## Running a LoopBack api in development

Start the database with `mx up` and the environment `dev`, then build and start the api with `mx api build` and
`mx api start`. It is reached on `http://localhost:3000`, and the explorer of its routes on
`http://localhost:3000/explorer`.

## See also

- [LoopBack 4](https://loopback.io/doc/en/lb4/) — the documentation of LoopBack
- [Databases](../databases.md) — the database of the api
- [Zibri](./zibri.md) — the api the Angular app is built for
