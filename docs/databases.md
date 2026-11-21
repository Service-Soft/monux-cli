# Databases

A database is a service of the Docker Compose files, Postgres or MariaDB, that one or more projects of the workspace
share. Each project has a database and a user of its own in it, which the service creates when it first starts, with
the credentials from `.env`.

## Adding a database

`mx add` adds a database service with the first api or Wordpress that needs one, or adds a database to an existing
service. See [Choosing the database](./projects.md#choosing-the-database).

| Type | Image | Port in `dev` |
|---|---|---|
| Postgres | `postgres:16` | 5432 |
| MariaDB | `mariadb:11` | 3306 |

A database service named `db` with the database `api` of the shop adds these values to `.env`:

| Value | What it is |
|---|---|
| `db_db_root_password` | The password of the superuser of the service |
| `db_api_database` | The name of the database of the project |
| `db_api_db_user` | The user of the project, `api_user` |
| `db_api_db_password` | The password of that user |

`db_db_host` is calculated: `localhost` in `dev`, where the project runs on your machine, and the name of the service
in the other environments.

## Initializing the databases of a service

The official images of Postgres and MariaDB create one database and one user from their variables. A service that
several projects share needs one of each per project, so every database is described in a file of its own:

| File | What it is |
|---|---|
| `databases/<service>/<number>.json` | One database of the service and its user, by the names of their values in `.env`. Committed |
| `databases/<service>/init/<number>.sql` | The script that creates that database and user. Written by `mx prepare`, excluded from git |

`databases/db/0.json` of the shop:

```json
{
    "type": "postgres",
    "nameEnvVariable": "db_api_database",
    "userEnvVariable": "db_api_db_user",
    "passwordEnvVariable": "db_api_db_password"
}
```

To give a project that `mx add` did not generate a database in an existing service, add its values to
`global-environment.model.ts` and `.env`, then add a file like the one above, and run `mx prepare`.

> [!WARNING]
> The service runs the scripts in `init/` only when its volume is empty, on its first start. A database added to a
> service that has started before needs the volume removed, which deletes every database in it, or the database
> created by hand.

## Looking into a database during development

`dev.docker-compose.yaml` has [adminer](https://www.adminer.org), a web interface for databases, on
`http://localhost:8080`. Log in with the name of the service as the server, such as `db`, and the user and password
of a project from `.env`.

## See also

- [Choosing the database](./projects.md#choosing-the-database) — the prompts of `mx add`
- [Environment variables](./environment.md) — where the credentials are
- [Running in development](./running.md#running-in-development) — the databases on your machine
