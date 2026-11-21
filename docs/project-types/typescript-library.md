# TypeScript library

A TypeScript library holds code that several projects of the workspace share, such as models or validation an api and
a website agree on. It builds to code that the apis, the Angular projects and other libraries can all import, in the
browser and on the server.

## Adding a TypeScript library

Run [`mx add`](../projects.md#adding-a-project-with-mx-add) and choose the type `ts-library`.

| Prompt | What it is |
|---|---|
| `Scope` | The scope of its package name, such as `@shop`. `@<workspace>` by default |
| `Projects that use the library` | The projects that get it as a dependency. None by default |

The library is in `libs/<name>`, with the package name `<scope>/<name>`, such as `@shop/shared`. Projects import it by
that name, during development and in their Docker images.

| Script | What it does |
|---|---|
| `npm run build` | Builds the library |
| `npm start` | Builds it again whenever you change it, so the projects that use it get the change |
| `npm run lint` | Lints it, `npm run lint:fix` fixes what can be fixed |

Keep it free of code that runs when it is imported, so a website that imports one model of it gets nothing else.

## See also

- [Angular library](./angular-library.md) — a library of components
- [Zibri](./zibri.md) — the contract library of a zibri api, which is a TypeScript library
