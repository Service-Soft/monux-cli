# Built from the root of the workspace, so that the install sees the workspace's lockfile.
# The build needs the dev dependencies, the sources and the compiler. What runs needs none
# of them, so they stay in a stage that is thrown away and only the second one is shipped.
FROM node:24-slim AS build
WORKDIR /workspace

# the manifests first, so that the install layer is reused for every build that does not
# change a dependency
COPY package.json package-lock.json ./
COPY apps/{{=name}}/package.json apps/{{=name}}/package.json
# mx adds the manifests of the libraries this project uses above this line
# only what this api depends on, out of everything the workspace does
RUN npm ci --workspace apps/{{=name}}

# the model the environment of every project is typed by
COPY global-environment.model.ts ./
COPY apps/{{=name}} apps/{{=name}}
# mx adds the libraries this project uses above this line
RUN npm run build --workspace apps/{{=name}}

# what running needs, out of what building needed, in the same resolution of the dependency tree
RUN npm prune --omit=dev --workspace apps/{{=name}}

FROM node:24-slim AS runtime
WORKDIR /workspace

ENV NODE_ENV=production

COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/{{=name}}/package.json apps/{{=name}}/package.json
COPY --from=build /workspace/apps/{{=name}}/dist apps/{{=name}}/dist
# the home page LoopBack serves
COPY apps/{{=name}}/public apps/{{=name}}/public

USER node
WORKDIR /workspace/apps/{{=name}}

# the port inside the container, which traefik forwards to. Its environment is passed by docker compose
EXPOSE 3000

# whether the process is up, which is what a restart should depend on
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD \
    node -e "fetch('http://127.0.0.1:3000/ping').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# the schema of the database follows the models first, with the migrate script of LoopBack. exec, so that the signal a
# stop sends arrives at node and the api shuts down in order
CMD ["sh", "-c", "node dist/apps/{{=name}}/src/migrate && exec node --enable-source-maps ."]
