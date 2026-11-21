# Wordpress

A Wordpress project is a site run with the [official Wordpress image](https://hub.docker.com/_/wordpress), for content
that someone edits in a CMS. It is a service of the Docker Compose files with a MariaDB database, and Wordpress itself
is as Wordpress ships it.

## Adding Wordpress

Run [`mx add`](../projects.md#adding-a-project-with-mx-add) and choose the type `wordpress`.

| Prompt | What it is |
|---|---|
| `sub domain` | The sub domain the site is reached under, such as `blog`. The root domain and `www` when left empty |

[The database prompts](../projects.md#choosing-the-database) follow. Wordpress uses MariaDB.

Wordpress has no folder in the workspace. It is a service of every compose file, with the image `wordpress:php8.5`.
Its uploads, themes and plugins are in the volume `<name>-data`, and its content in the database, so restarting or
updating the image loses nothing. On stage, basic auth is in front of it.

## Running Wordpress in development

Start it with `mx up` and the environment `dev`. It is reached on `http://localhost`, where its installation asks
for the name of the site and the first user.

## See also

- [Wordpress](https://wordpress.org/documentation/) — the documentation of Wordpress
- [Databases](../databases.md) — the database of the site
- [Deploying](../deploying.md) — the site on a server
