# Zibri

A zibri api is the backend of a workspace: its database, its users and their logins, its entities and its pages. It
is a project of [zibri](https://github.com/Service-Soft/zibri), generated with `zi new`, and the
[Angular app](./angular-app.md) of the workspace is built for it.

## Adding a zibri api

Run [`mx add`](../projects.md#adding-a-project-with-mx-add) and choose the type `zibri`.

| Prompt | What it is |
|---|---|
| `Port` | The port of the api in development. 3000 by default |
| `Sub domain` | The sub domain the api is reached under, such as `api`. The root domain and `www` when left empty |
| `Features of zibri` | The optional parts of zibri, see [Features](#features). Pages, the metrics dashboard and errors sent by email by default |
| `Email of the default user` | The email of the administrator zibri creates on its first start. The email of `mx init` by default |
| `Password of the default user` | The password of that administrator, at least 15 characters. Required |

[The database prompts](../projects.md#choosing-the-database) follow. A zibri api uses Postgres.

| What | Where |
|---|---|
| The api | `apps/<name>`, a zibri project as `zi new` generates it |
| Its contract library | `libs/<name>-contract`, such as `libs/api-contract`, with the package name `@<workspace>/<name>-contract` |
| Its service | `local.docker-compose.yaml`, `stage.docker-compose.yaml` and `docker-compose.yaml`, with the volume `<name>-zibri` for the files zibri writes, such as uploads |
| Its secrets | `.env`: `<name>_jwt_access_secret`, `<name>_jwt_refresh_secret`, `<name>_master_key`, `<name>_default_user_email` and `<name>_default_user_password` |
| The mail server | `.env`: `webserver_mail_host`, `webserver_mail_port`, `webserver_mail_user` and `webserver_mail_password`, which every api of the workspace shares. Empty, see [Sending mails](#sending-mails) |

The contract library holds what the api and its apps agree on: the names of the permissions and roles, the models the
api answers with and the paths of its routes. Both import it by its package name, so a change to a permission is a
compile error in every project that uses it.

## Features

| Feature | What it is |
|---|---|
| `Pages rendered by the api` | Pages the api renders itself, such as the explorer of its routes and its error page |
| `Documentation pages` | Documentation the api serves. Needs the pages |
| `Mailing list` | A mailing list users subscribe to. Needs the pages |
| `Metrics dashboard` | A dashboard of the metrics of the api. Needs the pages |
| `Errors sent by email` | Errors of the api are sent by email |

## Running a zibri api in development

Start the database with `mx up` and the environment `dev`, then the api with `mx api start`. It is built and
restarted whenever you change its code, and reached on `http://localhost:3000`.

The default user from the prompts can log in from the first start.

## Recording the version

Zibri records the routes of every version of the api in its `versions` folder, and checks a new version against them
before it starts. In development, it writes the record when the version in the `package.json` of the api changes. The
production image only reads it, and does not start with a version the folder does not record.

1. Set the new `version` in `apps/api/package.json`.
2. Start the api once in development, which records the version.
3. Commit the `versions` folder with the change.

[`mx up`](../running.md#starting-the-services) refuses to start the images of `local`, `stage` and `prod` while an
api's record lacks the version it runs, and names the api.

## Sending mails

A zibri api sends its mails, such as invitations and password resets, only on stage and production. In `dev` and
`local` it writes every mail to its log instead, as there is no mail server, and the links in a mail lead to
`localhost`.

Stage and production need the mail server in `.env`. See [What stage and production need](../deploying.md#what-stage-and-production-need).

## See also

- [Angular app](./angular-app.md) — the app for this api
- [Zibri](https://github.com/Service-Soft/zibri) — the documentation of zibri, which applies to the api unchanged
- [Deploying](../deploying.md) — what the api needs on a server
