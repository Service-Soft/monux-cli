# Goals of the LoopBack api

A LoopBack api is a backend of a workspace, built on LoopBack 4, for a project that wants LoopBack rather than zibri.
It is measured against the goals below, together with [the goals of Monux](../../../../GOALS.md).

# The goals

**It is part of the workspace.** Its Postgres database is a service of the Docker Compose files, initialized by
`mx prepare`. Its configuration comes from the typed environment of the workspace. It runs behind traefik like every
other service, in every environment, and changes to its schema are made with migrations.

**It is a LoopBack project like any other.** What `lb4` generates stays as LoopBack generates it, apart from what
being part of the workspace takes. Auth, logging and the rest are the project's to add the LoopBack way.

**It is not an api for the generated Angular app.** The app and the `@service-soft` libraries are built for
[zibri](../add-zibri/GOALS.md); `mx add` does not offer to generate an app for this api.

# How it is held

- **In the workspace**: the tests start the api with `mx up` in the dev and local environments, and it reaches its
  database.
