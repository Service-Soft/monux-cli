# Goals of the zibri api

A zibri api is the backend of a workspace: its database, its auth and its entities. `zi new` generates the project;
Monux adds what makes it part of the workspace. It is measured against the goals below, together with
[the goals of Monux](../../../../GOALS.md).

# The goals

**It pairs with the Angular app.** An [Angular app](../add-angular/GOALS.md) added for this api logs in, shows its
entities and change sets and sends its errors to it, with no manual wiring on either side. Users, roles, two factor
authentication and password reset are set up, and the default user from the prompts can log in.

**It is part of the workspace.** Its database is a service of the Docker Compose files, initialized by `mx prepare`.
Its configuration comes from the typed environment of the workspace. It runs behind traefik like every other service,
in every environment.

**It is a zibri project like any other.** What `zi new` generates stays as zibri generates it, apart from what being
part of the workspace takes. It follows [zibri's code style](https://github.com/Service-Soft/zibri/blob/release/CODE_STYLE.md),
and zibri's documentation applies to it unchanged.

# How it is held

- **With the app**: the tests generate this api and an Angular app for it, and log in with the default user.
- **In the workspace**: the tests start the api with `mx up` in the dev and local environments, and it reaches its
  database.

# Changing it

**What every zibri project needs goes into zibri or zibri-cli**, not into Monux. Monux changes the output of `zi new`
only for what the workspace needs.
