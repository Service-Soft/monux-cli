# Goals of the Nest api

A Nest api is a backend of a workspace, built on NestJS with TypeORM, for a project that wants Nest rather than zibri.
It is measured against the goals below, together with [the goals of Monux](../../../../GOALS.md).

# The goals

**It is part of the workspace.** Its database, Postgres or MariaDB, is a service of the Docker Compose files,
initialized by `mx prepare`. Its configuration comes from the typed environment of the workspace. It runs behind
traefik like every other service, in every environment, and documents itself with OpenAPI.

**It is a Nest project like any other.** What `nest new` generates stays as Nest generates it, apart from what being
part of the workspace takes. Auth, logging and the rest are the project's to add the Nest way.

**It is not an api for the generated Angular app.** The app and the `@service-soft` libraries are built for
[zibri](../add-zibri/GOALS.md); `mx add` does not offer to generate an app for this api.

# How it is held

- **In the workspace**: the tests start the api with `mx up` in the dev and local environments, with each database
  type, and it reaches its database.
