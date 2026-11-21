# Built from the root of the workspace, so that the install sees the workspace's lockfile.
FROM node:24-slim AS build
WORKDIR /workspace

# the manifests first, so that the install layer is reused for every build that does not change a dependency
COPY package.json package-lock.json ./
COPY apps/{{=name}}/package.json apps/{{=name}}/package.json
# mx adds the manifests of the libraries this project uses above this line
# only what this project depends on, out of everything the workspace does
RUN npm ci --workspace apps/{{=name}}

# the look every project of the workspace shares, and the model its environment is typed by
COPY theme.css global-environment.model.ts ./
COPY apps/{{=name}} apps/{{=name}}
# mx adds the libraries this project uses above this line. The build of the project builds them first
RUN npm run build --workspace apps/{{=name}}

# the server bundle holds what it depends on, so what runs is the build and nothing else
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace/apps/{{=name}}/dist/{{=name}} ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD \
    node -e "fetch('http://127.0.0.1:4000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/server.mjs"]
