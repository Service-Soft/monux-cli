<img src="https://raw.githubusercontent.com/Service-Soft/monux-cli/release/logo-full-width.png" alt="Monux CLI" height=100>

<br>

![NPM Version](https://img.shields.io/npm/v/monux-cli)
![NPM Last Update](https://img.shields.io/npm/last-update/monux-cli)
![NPM License](https://img.shields.io/npm/l/monux-cli)

# Monorepos with great user experience
Monux is an opiniated CLI Tool for handling typescript based monorepos.

In contrast to other tools in this space, Monux also aims to take care of:
- bundling and deploying your tech stack via Docker Compose
- handling reverse-proxying via traefik and ssl via lets-encrypt
- providing an automatic prepare step that
  - validates and creates type safe environment files based on root-level .env-file
  - creates files like robots.txt automatically
  - handles initializing sql databases and users based on automatically created configuration files with more support than docker compose options
- providing development support with commands for starting development services (eg. databases or CMS)

The projects that can be added to a Monux monorepo also provide a lot of functionality out of the box, like
- auth
- tailwind
- linting
- logging
- mailing capabilities
- change sets/soft delete
- database connections
- data driven navbars
- model-based input form generation based on decorators
- etc.

# Table of contents
- [Monorepos with great user experience](#monorepos-with-great-user-experience)
- [Table of contents](#table-of-contents)
- [Restrictions](#restrictions)
- [Installation](#installation)
- [Usage](#usage)
  - [help](#help)
  - [Initializing a new monorepo](#initializing-a-new-monorepo)
  - [Adding a new project to the monorepo](#adding-a-new-project-to-the-monorepo)
  - [Running development services](#running-development-services)
  - [Running npm scripts](#running-npm-scripts)
    - [Running npm scripts in multiple projects](#running-npm-scripts-in-multiple-projects)
  - [Handling environment variables](#handling-environment-variables)
    - [Static environment variables](#static-environment-variables)
    - [Calculated environment variables](#calculated-environment-variables)
    - [Example Usage](#example-usage)
      - [Define the variables globally](#define-the-variables-globally)
      - [Add the actual values](#add-the-actual-values)
      - [Define the variables locally](#define-the-variables-locally)
      - [Automatically create the projects environment.ts files](#automatically-create-the-projects-environmentts-files)
  - [Handling initial database content](#handling-initial-database-content)
    - [How do they work?](#how-do-they-work)
  - [Starting prod locally](#starting-prod-locally)
  - [Starting in production](#starting-in-production)
- [Supported project types](#supported-project-types)
  - [Angular app](#angular-app)
  - [Angular website](#angular-website)
  - [Angular library](#angular-library)
  - [LoopBack](#loopback)
  - [Typescript library](#typescript-library)
  - [Wordpress](#wordpress)
  - [Add projects manually](#add-projects-manually)
    - [Things to consider](#things-to-consider)
    - [Deployment / Docker](#deployment--docker)

# Restrictions
At the current state, adding projects via the Monux cli only supports a few handcrafted project types to make sure that the development and deployment process is as smooth as possible.

However, as it's using npm workspaces under the hood and none of its magic is hidden from the developer, it should be fairly simple to add a project manually.<br>
To check if you need to go the manual route for a certain framework, you can either just run the `mx add` command, or see [Supported project types](#supported-project-types).<br>
That section also includes a guide on how to add projects manually.

In addition, the amount of out of the box features provided by projects added with Monux is achieved by using packages either by the author of Monux or other third parties.<br>
We try to only integrate big and well supported third party packages like nodemailer or tailwind, but if that is a concern to you then you will probably want to add these projects without the help of Monux.

# Installation
```npm i -g monux-cli```

# Usage
## help
If you ever need to check which commands are available and what they do in short, you can run `mx help`.

In most cases, this should be enough to not need to consult this README.

## Initializing a new monorepo
To start using Monux, you will first need to initialize a monorepo. You can achieve that by running `mx init` inside a directory.

This will setup:
- docker
- git
- typescript
- npm workspaces for the `apps` and `libs` folders
- a global tailwind configuration
- environment configuration (via a global model and a .env file)
- eslint

## Adding a new project to the monorepo
Inside an initialized monorepo you need to run `mx add`.

The following questions will guide you through generating the new application or library. Some type of projects eg. the loopback 4 api might create additional projects, like a database.

To see a list of project types that are supported by this command, see [Supported project types](#supported-project-types).<br>
That section also includes a guide on how to add projects manually.

## Running development services
Some things like databases will be added to the monorepo solely in the docker compose.<br>
To use these during development, the cli includes the `mx up-dev` command.

## Running npm scripts
To run an npm script of one of your projects you can use `mx {projectName} {npmScript}`. This works for projects in the "apps" and "libs" directories of your monorepo.

This also supports common npm commands, like `npm install`.

### Running npm scripts in multiple projects
For things that you want to run in multiple projects (eg. `lint`) we have included the `mx run-all ${npmScript}` command.

## Handling environment variables
Monux provides a way to safely handle type safe environment variables. A lot of these are also added automatically when running the `mx add` command, like the base_url/port/sub_domain/db_password etc.

The system supports two kinds of environment variables, <b>static</b> and <b>calculated</b>.

### Static environment variables
Static variables work by having a global `.env`-file which contains all the static variables of all projects in the monorepo. The cli provides a command `mx prepare`, which validates the content of the `.env`-file based on the `StaticGlobalEnvironment` schema type defined in the `global-environment.model.ts`-file.

Each project where you actually want to use these variables has its own environment file, which is generated by the `mx prepare` command as well.<br>
How these environment files are generated depends on a `environment.model.ts`-file inside of each project. There you can define the keys of the global environment file that should be used by this specific project.<br>
That way it is possible to only have certain variables like an contact email-address be available to a website project, while certain other variables like a db-password are not.

### Calculated environment variables
Working with static variables can sometimes be pretty tedious. This is especially true when you want to support different "modes" in which to launch your application (like we do with the `mx up`, `mx up-dev` or `mx up-local` commands).<br>
For example, if we defined the variables "api_base_url", "website_base_url" and "admin_base_url" all statically, we would need to manually fiddle with the `.env`-file anytime we switch between dev and local.<br>
To solve this, Monux implements calculated environment variables.

The schema type works exactly the same as with static variables. It's called `CalculatedGlobalEnvironment` and is also inside the `global-environment.model.ts`-file.<br>
But instead of parsing the values from the `.env`-file during the prepare step, calculated variables are created by calling a method defined in the `calculationSchemaFor`-record of the `global-environment.model.ts`-file:

```ts
/**
* Defines how the CalculatedGlobalEnvironment values should be calculated.
* This is used by the "mx prepare" command.
* DONT CHANGE THE NAME ("calculationSchemaFor") OR FORMATTING. Otherwise Monux might not be able to detect it.
*/
const calculationSchemaFor: Record<
    keyof CalculatedGlobalEnvironment,
    (env: StaticGlobalEnvironment, fileName: DockerComposeFileName) => CalculatedGlobalEnvironment[keyof CalculatedGlobalEnvironment]
> = {
    test_base_url: (env, fileName) => {
        switch (fileName) {
            case 'dev.docker-compose.yaml': {
                return `http://localhost:${env.test_port}`;
            }
            case 'local.docker-compose.yaml': {
                return `http://${env.test_sub_domain}.localhost`;
            }
            case 'docker-compose.yaml': {
                return `https://${env.test_sub_domain}.${env.prod_root_domain}`;
            }
        }
    }
};
```

### Example Usage
In the following example we want to use two static environment variables, `api_db_password` and `public_contact_email`.


#### Define the variables globally
So in the `global-environment.model.ts` that was generated by Monux we add the following:

`global-environment.model.ts`
```ts
export type GlobalEnvironment = {
    // ...
    api_db_password: string,
    public_contact_email: string
    // ...
}
```

The model above is used to validate the environment variables we provide, so the current configuration validates:
- that both variables exist in the `.env`-file (you could change that by making them optional on the model)
- and that they are string values (you could also change their type to number which would validate that they are numbers etc.)

#### Add the actual values
To provide the actual values, we have to adjust the `.env`-file:

`.env`
```
api_db_password=super_secret_password
public_contact_email=public@email.address
```
#### Define the variables locally
Now that we have that, we need to define the variables that we want to use in each project where they are needed. We can do that by adjusting the respective environment.model.ts of these projects.

`apps/some-api-project/src/environment/environment.model.ts`
```ts
import { GlobalEnvironment } from '../../../../global-environment.model';

// eslint-disable-next-line typescript/typedef, unusedImports/no-unused-vars
const variables = defineVariables(['api_db_password'] as const);
//                                 ^ Here we define the variables
//                                   that this project needs

export type Environment = {
    [key in (typeof variables)[number]]: GlobalEnvironment[key];
};

function defineVariables<T extends (keyof GlobalEnvironment)[]>(keys: readonly [...T]): readonly [...T] {
    return keys;
}
```

`apps/some-website-project/src/environment/environment.model.ts`
```ts
import { GlobalEnvironment } from '../../../../global-environment.model';

// eslint-disable-next-line typescript/typedef, unusedImports/no-unused-vars
const variables = defineVariables(['public_contact_email'] as const);
//                                 ^ Here we define the variables
//                                   that this project needs

export type Environment = {
    [key in (typeof variables)[number]]: GlobalEnvironment[key];
};

function defineVariables<T extends (keyof GlobalEnvironment)[]>(keys: readonly [...T]): readonly [...T] {
    return keys;
}
```

Notice that these files also include a Environment type for the specific project.

#### Automatically create the projects environment.ts files
The `environment.ts` that is used by the project needs to be generated by running `mx prepare`. This will also take care of the validation mentioned before.<br>
When you use any of `mx up`, `mx up-dev` or `mx up-local` to deploy the project, the `mx prepare` command is actually called internally, so you don't have to call it manually.

## Handling initial database content
Because Docker Compose environment variables can often only initialize 1 default user and 1 default db, Monux provides a way to add multiple of these during the `mx prepare` command.

When adding a project that uses a database, these are created automatically and in most cases the developer does not have to interact with this system at all.

However, if you want your database to be used by multiple projects and one of them was not generated by Monux, they can come in really handy.

<cite>
For any project added through the cli, Monux is actually able to generate additional files for an existing database automatically.
In that case you don't have to interact with the system at all.
</cite>

### How do they work?
On the root level of your monorepo there is an automatically generated databases directory.

Whenever you add a project that configures some sort of database a subfolder with the database service name is generated (the same as in the docker compose file). Then a configuration json file is added inside that folder.

When running the `mx prepare` command, these configuration files are used to generate startup scripts for the database inside of the databases init folder (databases/nameOfDb/init/actualInitFile).

What's nice about this is that these configuration files actually only reference the environment variable names instead of real values, so things like db credentials are only ever need to be provided in the .env file, which is excluded from the git repository by default.

Monux handles everything regarding mapping these variable names back to values automatically, so you don't have to worry about it at all.

## Starting prod locally
Often times you want to test your project under production like constraints (eg. when developing a website to check its SEO performance).

For that Monux provides the command `mx up-local`.

## Starting in production
You can start the whole monorepo with the single command `mx up`.

This will try to run the `mx prepare` command.<br>
The only info required by that command is inside the `.env`-file.<br>
Monux also validates the `.env`-file, so by continueously running the command you can fill it little by little and don't need to worry that you start your monorepo with invalid or missing environment variables.

# Supported project types
## Angular app
## Angular website
## Angular library
WIP
## LoopBack
## Typescript library
## Wordpress
## Add projects manually
One of the reasons that Monux was created was the amount of abstraction layers added by tools like Nx.<br>
The magic was really cool as long as everything worked, but made debugging issues much harder.

For that reason, Monux is simply using npm workspaces under the hood and none of its magic is hidden from the developer, besides maybe validating and creating environment files, which is explained in detail in [Handling environment variables](#handling-environment-variables).

Because of that it should be fairly simple to add any project/framework/library manually by just taking a look at existing projects.

### Things to consider
- add apps or libs in the respective folder
- apps need to have a src/environment/environment.model.ts file
- you also need to manually add them to the docker compose files
- let any tsconfig extend the root tsconfig
- let any tailwind config extend the root tailwind config

### Deployment / Docker
When you add a custom app that you want to deploy with a Dockerfile, you need to make sure that it's either:
- AOT (ahead of time) compiled (eg. by bundling)
- or that the app can somehow access the node_modules folder (eg. by copying it to the docker container)

<i>Alternatively, you could also use the whole monorepo in the container, but that might take a lot of disk space and time to build the image. If you decide to go this route, you can probably ignore the warning below, as all symlinks can be resolved inside the container.</i>

<b>Warning:</b><br>
Libraries of the monorepo are only symlinked in the node_modules folder.

So if you have a manually added app that is JIT (just in time) compiled, you need to replace the symlinked libraries inside the node_modules folder that you copied to the container with the actual libraries.

An example of how this might look like is below, but this is a really custom problem so you have to adapt the code to your needs:

```Dockerfile
FROM node:20 AS build

# Set to a non-root built-in user `node`
USER node
RUN mkdir -p /home/node/root
COPY --chown=node . /home/node/root
WORKDIR /home/node/root
RUN npm install
RUN npm run build --workspace=apps/api
RUN npm run build --workspace=libs/shared

FROM node:20
USER node
WORKDIR /usr/app
COPY --from=build --chown=node:node /home/node/root/apps/api/dist/apps/api ./
COPY --from=build --chown=node:node /home/node/root/node_modules ./node_modules
RUN rm -rf node_modules/@myproject/shared
RUN mkdir -p node_modules/@myproject
COPY --from=build --chown=node:node /home/node/root/libs/shared ./node_modules/@myproject/shared

ENV HOST=0.0.0.0 PORT=3000
EXPOSE ${PORT}
CMD node src
```