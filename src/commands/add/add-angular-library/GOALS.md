# Goals of the Angular library

An Angular library holds the components the apps and websites of one workspace share, such as its own design. It is
measured against the goals below, together with [the goals of Monux](../../../../GOALS.md).

# The goals

**It is built like the `@service-soft` libraries.** Every component is a secondary entry point of its own, the library
ships Tailwind sources for the consumer's build instead of prebuilt css, and it uses the tokens of `@service-soft/ui`.
It follows [the code style of angular-libraries](https://github.com/Service-Soft/angular-libraries/blob/release/CODE_STYLE.md),
so a component can move from a workspace into those libraries without being rewritten.

**A page only loads what it uses.** Importing one component of the library adds that component to a bundle, and
nothing runs at import time. A website using the library keeps its [load time](../add-angular-website/GOALS.md).

**Every component is seen and checked in Storybook.** Each component has stories for its variants and states, and AXE
checks every story in light and dark mode.

**The apps of the workspace use it like a package.** They import it by its package name, during development and in
their Docker images, without a step the developer has to remember.

# How it is held

- **Entry points and size**: the tests build an app that imports one component of the generated library, and the
  bundle holds nothing else of it.
- **Stories**: the tests build the generated Storybook and run AXE on its stories.
- **Use in an app**: the tests build the Docker image of an app that uses the library.
