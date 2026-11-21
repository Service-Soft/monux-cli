# Angular app

An Angular app is the frontend of a [zibri api](./zibri.md), such as the admin of a shop: users log in, manage the
users and tenants of the api and read its logs, also without a connection. It comes with what every such app needs,
from the [`@service-soft` libraries](https://github.com/Service-Soft/angular-libraries), so its own code is what is
special about it.

## Adding an Angular app

Add a zibri api first. Then run [`mx add`](../projects.md#adding-a-project-with-mx-add) and choose the type `angular`.

| Prompt | What it is |
|---|---|
| `The zibri api of the app` | The api the app logs in against. Required |
| `Port` | The port of the app in development. 4200 by default |
| `Sub domain` | The sub domain the app is reached under. `admin` by default |
| `Name of the app, as its titles show it` | The name in the navbar and in the title of every page. The name of the project in Pascal case by default |
| `Languages of the app, the one it is written in first, like "en, de"` | See [Localization](../localization.md). `en` by default |

The app is in `apps/<name>`. Its service is in `local.docker-compose.yaml`, `stage.docker-compose.yaml` and
`docker-compose.yaml`, with basic auth in front of it on stage. The api learns the URL of the app: its mails link to
the pages of the app that set a new password and accept an invitation, and it accepts requests from the app.

## What the app does

| Page | What it is | Who sees it |
|---|---|---|
| `login` | Logging in, with two factor authentication | Everyone |
| `request-password-reset` and the page its mail links to | Setting a new password | Everyone |
| The page an invitation mail links to | Accepting an invitation to a tenant | Everyone |
| `account` | Changing the password, setting up two factor authentication and ending sessions | Users who are logged in |
| `users` | The users: inviting, editing and removing them | Users with the permission to read the members of their tenant, or every user of the platform |
| `tenants` | The tenants: creating, renaming, deactivating and deleting them | Users with the platform permission to read tenants |
| `logs` | The logs of the api, the errors of the app included | Users with the permission to read the logs |

A user who belongs to several tenants switches between them in the navbar. The navbar shows only the pages the user
may open, from the permissions in the [contract library](./zibri.md#adding-a-zibri-api) of the api.

The app installs as a progressive web app: it opens without a connection, keeps the changes made offline and syncs
them once the connection is back. Errors of the app are sent to the logs of the api.

Every page is rendered in the browser, as everything the app shows needs a login.

## Running an Angular app in development

Start the api, see [Running a zibri api in development](./zibri.md#running-a-zibri-api-in-development), then the app
with `mx admin start`. It is reached on `http://localhost:4200` and logs in against the api with the default user.

| Script | What it does |
|---|---|
| `npm start` | Serves the app in development, in its first language |
| `npm run build` | Builds the app in every language |
| `npm test` | Runs its tests once |
| `npm run lint` | Lints it, `npm run lint:fix` fixes what can be fixed |
| `npm run i18n` | Collects its texts for translation, see [Localization](../localization.md) |

## Adding an entity

An entity is a model the app shows in a table and edits in a form, such as the users. Its model describes its
properties with the metadata of [`@service-soft/ngx-entity`](https://github.com/Service-Soft/angular-libraries),
which builds the table, the forms and their validation from it. The users page, in `src/app/pages/users`, with its
model in `src/app/models/user.model.ts` and its service in `src/app/services/user.service.ts`, is the example to
follow.

## See also

- [Zibri](./zibri.md) — the api of the app
- [Localization](../localization.md) — the app in several languages
- [angular-libraries](https://github.com/Service-Soft/angular-libraries) — the libraries the app is built on
