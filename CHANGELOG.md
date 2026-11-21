# Changelog

Every release of Monux, newest first: what it adds, changes, fixes and removes, and what an existing workspace has to
change to keep working with it. Versions follow [semantic versioning](https://semver.org): a major version can need
changes to a workspace, and says which.

## 3.0.0 - 2026-11-21

Monux generates every project type again, from templates a workspace can read: on Angular 22, Tailwind CSS 4, zibri
3.2 and the `@service-soft` libraries. The generated Angular app is built for a zibri api. LoopBack and NestJS apis
are plain apis of their frameworks. Every generated project builds, lints without warnings, passes its tests and
starts with `mx up` in every environment. The tests of Monux check that by generating and starting the workspaces.

### Breaking changes

- The Angular app is generated for a zibri api, with the `@service-soft` libraries: `ngx-auth`, `ngx-entity`,
  `ngx-change-sets`, `ngx-pwa`, `ngx-navigation` and `ui`. It is no longer generated for LoopBack, and the
  `ngx-material-*` libraries are gone.
- LoopBack and NestJS apis are plain apis of their frameworks, without the `lbx-*` packages for auth, change sets and
  logging.
- Angular projects use Tailwind CSS 4, with a `theme.css` at the root of the workspace that every Angular project
  shares. The root `tailwind.config.js` is gone.
- Stage and production keep the certificates of Let's Encrypt in the volume `letsencrypt`, not in the folder
  `./letsencrypt`. Basic auth on stage is read from `.htpasswd` at the root of the workspace, which `mx prepare`
  writes, not from `./config`.
- `mx prepare` for stage and production needs `webserver_mail_host` and `webserver_mail_port` in a workspace that
  defines them, as a zibri api sends its mails there.
- `mx up` refuses to start the images of a zibri api whose `versions` folder does not record the version it runs.
- `mx prepare` no longer writes `robots.txt`. The `server.ts` of a website serves it.

### Added

- `mx generateComponent` adds a component to an Angular library.
- Localization of websites and apps: the languages are asked in `mx add`, each is a build of its own below its code,
  and `npm run i18n` brings new texts into the translation of every language.
- Restoring the workspace: when `mx init`, `mx add`, `mx prepare`, `mx generatePage` or `mx generateComponent` is
  interrupted or fails, the files of the workspace are restored as they were before it.
- The documentation in `docs/`, with a page per task and per project type.

### Changed

- `mx add zibri` generates the api with zibri 3.2, its contract library, its database, its default user and the
  routes the Angular app needs: users, tenants, invitations, roles and logs.
- `mx add angular` generates the app of a zibri api, with login, two factor authentication, password reset,
  invitations, users, tenants, logs, a tenant switcher and offline sync.
- `mx add angular-website` generates a prerendered website with imprint and privacy pages, SEO and `llms.txt` for
  each page, trackings that wait for consent, and fonts cut down to the letters it uses.
- `mx add angular-library` generates components as entry points of their own, with Storybook and AXE checks of every
  story.
- `mx generatePage` adds a page to a website with its description for search engines, and links it from the navbar,
  the footer or nowhere.

### Fixed

- The routers of traefik used the entrypoint `web_secure` and the resolver `ssl_resolver`, which traefik does not
  have, so no service was reached over HTTPS on stage and production.
- Basic auth on stage was never set up: the services were added without it, and the file of its credentials was never
  written.
- The redirect of `www` to the root domain matched any character in place of the dot.
- A `=` in a value of `.env` was dropped.
- `mx add` accepted an empty project name.
- The database prompt offered services of a type the project does not use.
- The arguments after the script of `mx <project> <script>` went to npm instead of the script.
- `mx run-all` ran outside of a workspace.
- `mx up <workspace>` and `mx down <workspace>` did not find the environment of that workspace from another directory.
- The workflow of `mx init` ran on whatever Node the runner had; it sets up Node 24.
- The Docker images used `node:20`, which is no longer supported; they use `node:24-slim`.

### Upgrading an existing workspace

1. In `stage.docker-compose.yaml`, give traefik the volume of the certificates and the file of basic auth, and remove
   its `entrypoint` and its `environment`:

   ```yaml
   # stage.docker-compose.yaml
   services:
       traefik:
           volumes:
               - letsencrypt:/letsencrypt
               - /var/run/docker.sock:/var/run/docker.sock:ro
               - ./.htpasswd:/config/.htpasswd:ro

   volumes:
       letsencrypt:
   ```

2. In `docker-compose.yaml`, the same without the line of `.htpasswd`.
3. In both files, replace `entrypoints=web_secure` with `entrypoints=websecure` and `certresolver=ssl_resolver` with
   `certresolver=sslresolver` in the labels of every service.
4. Add `.htpasswd` to `.gitignore`, and remove the folders `letsencrypt` and `config`. Traefik requests the
   certificates again on its next start.
5. Set `webserver_mail_host` and `webserver_mail_port` in the `.env` of stage and production, if the workspace defines
   them.
6. Run `mx up`, which writes `.htpasswd` and checks the rest.

Upgrading Monux does not change the projects of a workspace. To get what 3.0.0 generates for a project type, add a new
project of it with `mx add` and move your code over.
