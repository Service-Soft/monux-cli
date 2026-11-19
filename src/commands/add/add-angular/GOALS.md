# Goals of the Angular app

An Angular app is the admin or the frontend of an api in the same workspace: people log in, manage entities and work
with them every day, sometimes without a connection. It is measured against the goals below, together with
[the goals of Monux](../../../../GOALS.md).

# The goals

**It works with its api out of the box.** An app added for a [zibri api](../add-zibri/GOALS.md) logs in against it,
with two factor authentication and password reset, shows and edits its entities, shows their change sets and sends its
errors to the api's logs. Nothing has to be wired by hand. The routes the app needs that zibri does not ship, such as
the ones for change sets and logs, are generated into the api, where the project decides who may call them.

**An entity is a model, not a feature.** Adding an entity to the app means adding its model with the metadata of
`@service-soft/ngx-entity` and a route. Its table, its forms, its validation and its change sets come from the
library. Code the developer writes per entity is code for what is special about it.

**It keeps working offline.** The app installs as a PWA, opens without a connection, keeps the changes made while
offline and syncs them through `@service-soft/ngx-pwa` once it is back online, telling the user what was synced and
what failed.

The app follows [the code style of angular-libraries](https://github.com/Service-Soft/angular-libraries/blob/release/CODE_STYLE.md),
its accessibility rules included, like every Angular project Monux generates.

# How it is held

Each goal needs a test on the app the tests generate, next to a generated zibri api:

- **With its api**: logging in, creating, editing and deleting an entity, and reading its change sets work against the
  running api.
- **Per entity**: the tests add an entity the way the README describes, and its table and form work with nothing else
  written.
- **Offline**: a change made offline is synced once the connection is back, and the app opens without a connection.

# Changing it

**What every app needs goes into the libraries**, `@service-soft/ngx-auth`, `ngx-entity`, `ngx-change-sets`,
`ngx-pwa` and the others, not into the templates of this app.
