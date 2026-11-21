# Angular library

An Angular library holds the components the websites and apps of a workspace share, such as the design of the shop.
It is built like the [`@service-soft` libraries](https://github.com/Service-Soft/angular-libraries): every component
is an entry point of its own, so a page that imports one component gets nothing else of the library, and every
component has stories in Storybook that are checked for accessibility.

## Adding an Angular library

Run [`mx add`](../projects.md#adding-a-project-with-mx-add) and choose the type `angular-library`.

| Prompt | What it is |
|---|---|
| `Scope` | The scope of its package name, such as `@shop`. `@<workspace>` by default |
| `Prefix of the selectors of its components` | The start of the selector of every component, such as `shop` for `<shop-notice>`. `app`, `ng`, `ngx` and `ui` are taken. The name of the workspace by default |
| `Name of its first component` | The component the library starts with. `Notice` by default |
| `Angular projects that use the library` | The websites and apps that get it as a dependency. None by default |

The library is in `libs/<name>`, with the package name `<scope>/<name>`, such as `@shop/components`. Its components
use the colors, fonts and sizes of `theme.css`, the tokens of `@service-soft/ui`.

| Script | What it does |
|---|---|
| `npm run build` | Builds the library |
| `npm start` | Builds it again whenever you change it, so the projects that use it get the change |
| `npm test` | Runs the tests of its components, and the accessibility checks of its stories |
| `npm run storybook` | Shows its components in Storybook |
| `npm run lint` | Lints it, `npm run lint:fix` fixes what can be fixed |

## Adding a component

| Command | What it does |
|---|---|
| `mx generateComponent`, `mx gc` | Adds a component to a library, as an entry point of its own with its stories |

| Prompt | What it is |
|---|---|
| `Angular library` | The library to add the component to. Required |
| `Name of the component` | The name of the component, such as `OpeningHours`. Required |

The component is in `libs/<library>/<name>`, such as `libs/components/opening-hours`, with its tests, its stories and
a provider for its configuration. A project imports it from its own entry point:

```ts
// apps/website/src/app/pages/home/home.component.ts
import { Component } from '@angular/core';
import { OpeningHoursComponent } from '@shop/components/opening-hours';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    imports: [OpeningHoursComponent]
})
export class HomeComponent {}
```

## Checking the components in Storybook

`npm run storybook` shows every story of every component. `npm test` builds Storybook and checks every story with
[AXE](https://github.com/dequelabs/axe-core), in light and dark mode, and fails on any violation.

## See also

- [Angular website](./angular-website.md) — a website that uses the components
- [Angular app](./angular-app.md) — an app that uses the components
- [TypeScript library](./typescript-library.md) — a library of code without components
