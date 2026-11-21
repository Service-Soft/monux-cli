# Goals of Wordpress

A Wordpress project is a site run with the official Wordpress image, for when the content belongs to someone who
edits it in a CMS. It is measured against the goals below, together with [the goals of Monux](../../../../GOALS.md).

# The goals

**It is part of the workspace.** Wordpress and its MariaDB database are services of the Docker Compose files, the
database is initialized by `mx prepare`, and the credentials come from the environment of the workspace. It runs
behind traefik like every other service, in every environment.

**Content survives.** Uploads, themes, plugins and the database are kept in volumes, so restarting, rebuilding or
updating the image loses nothing.

**It is Wordpress as Wordpress ships it.** Monux configures the container, not Wordpress itself: a developer who knows
Wordpress finds nothing unfamiliar.

# How it is held

- **In the workspace**: the tests start Wordpress with `mx up` in the dev environment, and its installation page
  answers.
- **Content**: the tests restart the services, and content written before is still there.
