# Deploying

Stage and production run the same images as `local`, on a server, behind traefik with HTTPS. Stage puts basic auth in
front of the websites and apps, so that only you and the people you give the password see a version before it is
released. Deploying is cloning the workspace onto the server, adding its `.env` and running `mx up`.

## Preparing the server

The server needs:

- Docker with Docker Compose, Node 24 or newer, and Monux: `npm i -g monux-cli`
- Ports 80 and 443 open. Let's Encrypt checks on port 80 that the domain is yours before it issues a certificate
- A DNS record for every domain of the workspace that points to the server: the root domain and `www` for a project
  without a sub domain, and each sub domain, such as `api.example.com` and `admin.example.com`

Stage needs the same for its own domain, such as `example-staging.com`.

## Deploying the workspace

1. Clone the workspace onto the server.
2. Copy `.env` onto the server, next to `.env.public`. It is excluded from git, so it never comes with the clone.
3. Run `mx up` and choose `prod`, or `stage` on the stage server.

`mx up` validates `.env` and `.env.public` first and says what is missing, so a value can be filled in and the command
run again until it starts. Traefik gets a certificate for each domain on the first request to it.

To deploy a new version, pull it and run `mx up` again. It builds the images that changed and replaces their
containers.

## What stage and production need

| What | Why |
|---|---|
| `webserver_mail_host` and `webserver_mail_port` in `.env` | A zibri api sends its mails only on stage and production, through this server. `webserver_mail_user` and `webserver_mail_password` when the server needs a login |
| The `versions` folder of every zibri api, committed | The image of a zibri api only reads the version record and does not start without it, see [Recording the version](./project-types/zibri.md#recording-the-version) |
| `basic_auth_user` and `basic_auth_password` in `.env`, on stage | The login of the basic auth in front of the websites and apps |

> [!WARNING]
> `mx init` sets `basic_auth_user` to `user` and `basic_auth_password` to `password`. Change both before you deploy
> stage.

## Protecting stage with basic auth

On stage, every website, app and Wordpress asks for the user and password from `.env` before it shows anything. The
apis do not, so the apps behind the basic auth can call them. `mx prepare` writes the login for traefik into
`.htpasswd` at the root of the workspace, which is excluded from git.

## Keeping the certificates

Traefik keeps the certificates from Let's Encrypt in the volume `letsencrypt`. `mx down` keeps it. Removing it, such
as with `docker compose down -v`, makes traefik request every certificate again.

> [!WARNING]
> Let's Encrypt limits how many certificates a domain gets in a week. Keep the volume, so that a restart reuses the
> certificates it has.

## See also

- [Running the production build locally](./running.md#running-the-production-build-locally) — the same images on your machine
- [Environment variables](./environment.md) — where the values come from
- [Zibri](./project-types/zibri.md) — the mails and the version record of a zibri api
