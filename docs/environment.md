# Environment variables

Every value the projects of a workspace run on is in two files at its root, `.env` and `.env.public`, and is typed in
`global-environment.model.ts`. Each project declares the values it reads, and `mx prepare` writes them into a typed
`environment.ts` of that project, for the [environment](./workspace.md#the-environments) it starts in. A project gets
only what it declares, so a secret of the api never reaches a website.

## Static and calculated values

| Kind | Where the value is | Typed in |
|---|---|---|
| Static | `.env` for secrets, `.env.public` for values that may be committed | `StaticGlobalEnvironment` |
| Calculated | Computed from the static values, differently in each environment | `CalculatedGlobalEnvironment`, computed by `calculationSchemaFor` |

`mx add` adds the values of the projects it generates, such as `api_port`, `api_sub_domain` and `api_jwt_access_secret`
of an api named `api`. Their names start with the name of the project in snake case.

A calculated value is a value that depends on the environment, such as the URL of the api, which is
`http://localhost:3000` in `dev` and `https://api.example.com` in `prod`. `calculationSchemaFor` holds a function for
each one, which gets the static values and the compose file of the environment:

```ts
// global-environment.model.ts
const calculationSchemaFor: Record<
    keyof CalculatedGlobalEnvironment,
    (env: StaticGlobalEnvironment, fileName: DockerComposeFileName) => CalculatedGlobalEnvironment[keyof CalculatedGlobalEnvironment]
> = {
    api_base_url: (env, fileName) => {
        switch (fileName) {
            case 'dev.docker-compose.yaml': {
                return `http://localhost:${env.api_port}`;
            }
            case 'local.docker-compose.yaml': {
                return `http://${env.api_sub_domain}.localhost`;
            }
            case 'docker-compose.yaml': {
                return `https://${env.api_sub_domain}.${env.prod_root_domain}`;
            }
            case 'stage.docker-compose.yaml': {
                return `https://${env.api_sub_domain}.${env.stage_root_domain}`;
            }
        }
    }
};
```

> [!NOTE]
> `mx add` reads and extends `global-environment.model.ts`. Keep the names `StaticGlobalEnvironment`,
> `CalculatedGlobalEnvironment` and `calculationSchemaFor`, and one value per line.

## Adding a value

The website of the shop shows a contact email, which may be committed:

1. Type it in `StaticGlobalEnvironment` of `global-environment.model.ts`. A `?` after the name makes it optional:

   ```ts
   // global-environment.model.ts
   type StaticGlobalEnvironment = {
       prod_root_domain: string,
       website_contact_email: string
   };
   ```

2. Set it in `.env.public`, or in `.env` for a secret:

   ```sh
   # .env.public
   website_contact_email=contact@example.com
   ```

3. Declare it in the project that reads it, see [Reading values in a project](#reading-values-in-a-project).
4. Run `mx prepare`.

The types are `string`, `number` and `boolean`. `mx prepare` refuses values that do not match them:

| Message | What is wrong |
|---|---|
| `should not be empty` | A required value is missing or empty |
| `should not be empty on stage and prod` | The mail server, `webserver_mail_host` and `webserver_mail_port`, is missing for an environment that sends mails |
| `should be a valid number` | A `number` holds something else |
| `should be a valid boolean` | A `boolean` holds something other than `true` or `false` |
| `File does not exist` | `.env` or `.env.public` is missing |

## Reading values in a project

Each app declares the values it reads in `src/environment/environment.model.ts`, in the list of `defineVariables`:

```ts
// apps/website/src/environment/environment.model.ts
import { GlobalEnvironment } from '../../../../global-environment.model';

// eslint-disable-next-line typescript/typedef, unusedImports/no-unused-vars
const variables = defineVariables(['website_contact_email', 'website_base_url', 'env'] as const);

export type Environment = {
    [key in (typeof variables)[number]]: GlobalEnvironment[key];
};

function defineVariables<T extends (keyof GlobalEnvironment)[]>(keys: readonly [...T]): readonly [...T] {
    return keys;
}
```

The project imports the values from `src/environment/environment.ts`, which `mx prepare` writes:

```ts
// apps/website/src/app/pages/imprint/imprint.component.ts
import { Component } from '@angular/core';

import { environment } from '../../../environment/environment';

@Component({
    selector: 'app-imprint',
    templateUrl: './imprint.component.html'
})
export class ImprintComponent {
    protected readonly contactEmail: string = environment.website_contact_email;
}
```

How a project gets its values depends on where it runs:

| Project | How it gets the values |
|---|---|
| Angular website, Angular app | `environment.ts` holds the values themselves, and the build compiles them in |
| zibri, LoopBack, NestJS | `environment.ts` reads them when the api starts: from the variables of its process, which Docker Compose passes to its container, or from the `.env` that `mx prepare` writes next to the project |

> [!WARNING]
> Everything an Angular project declares is in the JavaScript its users download. Declare only public values there,
> never a secret.

`environment.ts` and the `.env` of a project are excluded from git. Run `mx prepare` after cloning the workspace, and
after changing a value. [`mx up`](./running.md#starting-the-services) runs it before it starts the services.

| Command | What it does |
|---|---|
| `mx prepare`, `mx p` | Validates `.env` and `.env.public`, and writes the `environment.ts` of every app and the scripts of the databases for the environment you choose |

| Prompt | What it is |
|---|---|
| `env` | The environment: `dev`, `local`, `stage` or `prod`. Required |

## See also

- [The environments](./workspace.md#the-environments) — where each environment runs
- [Databases](./databases.md) — the values of the databases
- [Deploying](./deploying.md) — the values stage and prod need
