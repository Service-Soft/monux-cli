<img src="https://raw.githubusercontent.com/Service-Soft/monux-cli/release/logo-full-width.png" alt="Monux CLI" height=100>

![NPM Version](https://img.shields.io/npm/v/monux-cli)
![NPM Last Update](https://img.shields.io/npm/last-update/monux-cli)
![NPM License](https://img.shields.io/npm/l/monux-cli)

# Monux

Monux is a CLI for TypeScript monorepos. It adds the projects a product needs to one workspace and makes them part of
it: their services in the Docker Compose files, their typed configuration and their databases. Every project builds,
lints, passes its tests and runs with Docker Compose behind traefik, with HTTPS from Let's Encrypt, in development, on
your machine, on stage and in production.

A workspace holds as many projects as the product needs, of the [project types](#project-types) you choose: apis with
[zibri](https://github.com/Service-Soft/zibri), LoopBack or NestJS, Angular websites and apps, Wordpress, and the
libraries they share. A project of any other framework is [added by hand](./docs/projects.md#adding-a-project-by-hand).
Some types are built for each other: an Angular app added for a zibri api logs in against it with nothing wired by
hand.

A workspace is npm workspaces, Docker Compose files and normal projects of their frameworks, where Nx has its own
build system and task runner. Every file is code you can read and change, and no project imports Monux.

## Installing Monux

Monux needs Node 24 or newer, and Docker with Docker Compose.

```sh
npm i -g monux-cli
```

## Starting a workspace

```sh
mkdir shop
cd shop
mx init
mx add
```

`mx init` asks for the domains of production and stage. `mx add` asks for the type and the name of a project; run it
once for each project. A shop could have a `zibri` api named `api`, an `angular` app named `admin` for it, and an
`angular-website` named `website`. Then start the databases and the projects in development:

```sh
mx up
mx api start
mx admin start
```

`mx up` asks for the environment; choose `dev`. Each project is on `http://localhost:<port>`, with the port from its
prompts, such as `http://localhost:4200` for the app.

## Documentation

| Page | What is on it |
|---|---|
| [Creating a workspace](./docs/workspace.md) | `mx init`, what a workspace holds and its environments |
| [Adding a project](./docs/projects.md) | `mx add`, the project types, their databases and adding a project by hand |
| [Environment variables](./docs/environment.md) | The typed values every project reads, from `.env` and `.env.public` |
| [Databases](./docs/databases.md) | The databases of the projects and how they are initialized |
| [Running the workspace](./docs/running.md) | Development, the production build on your machine, and the scripts of the projects |
| [Deploying](./docs/deploying.md) | Stage and production on a server |
| [Localization](./docs/localization.md) | A website or app in several languages |
| [Commands](./docs/commands.md) | Every command of `mx` |

## Project types

| Project type | What it is |
|---|---|
| [Zibri](./docs/project-types/zibri.md) | An api with its database, users, logins and entities, which the Angular app is built for |
| [Angular app](./docs/project-types/angular-app.md) | The app of a zibri api, such as its admin, also offline |
| [Angular website](./docs/project-types/angular-website.md) | A prerendered website, with SEO, accessibility and consent for tracking |
| [Angular library](./docs/project-types/angular-library.md) | Components the Angular projects share, with Storybook |
| [TypeScript library](./docs/project-types/typescript-library.md) | Code several projects share |
| [LoopBack](./docs/project-types/loopback.md) | A LoopBack 4 api with Postgres |
| [NestJS](./docs/project-types/nest.md) | A NestJS api with TypeORM, and Postgres or MariaDB |
| [Wordpress](./docs/project-types/wordpress.md) | A Wordpress site with MariaDB |

## Contributing

[GOALS.md](./GOALS.md) says what Monux is for and what every change is measured against.
[CONTRIBUTING.md](./CONTRIBUTING.md) says how to run the tests and submit a change.
