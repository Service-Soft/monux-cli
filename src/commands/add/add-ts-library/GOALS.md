# Goals of the Typescript library

A Typescript library holds code that several projects of one workspace share, such as the models an api and its app
agree on. It is measured against the goals below, together with [the goals of Monux](../../../../GOALS.md).

# The goals

**Every project can use it.** It builds to code that the apis, the Angular projects and other libraries of the
workspace can all import, in the browser and on the server.

**It is a package like any other.** Projects import it by its package name, during development and in their Docker
images. A change to the library reaches the projects that use it without a step the developer has to remember.

**It holds nothing a project does not import.** It has no side effects at import time, so a website importing one
model of it does not get the rest.

# How it is held

- **Use everywhere**: the tests import the generated library in a generated api and a generated Angular app and build
  both, their Docker images included.
