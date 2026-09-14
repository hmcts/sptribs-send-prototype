# ---- Base image ----
FROM hmctsprod.azurecr.io/base/node:20-alpine AS base

USER root
RUN corepack enable
USER hmcts

# ---- Dependencies image ----
FROM base AS dependencies

WORKDIR /app
USER root
RUN chown -R hmcts:hmcts /app
USER hmcts

COPY --chown=hmcts:hmcts package.json yarn.lock .yarnrc.yml ./

# .yarnrc.yml authenticates to the Azure Artifacts feed with
# `npmAuthToken: "exec:az account get-access-token …"`, which works on a developer machine and
# cannot work here: the image has no Azure CLI and no Azure identity, and the CNP pipeline
# builds this with ACR Tasks rather than on the Jenkins agent, so there is no logged-in `az`
# to borrow either. yarn runs the exec, gets nothing, and fails the install.
#
# The feed serves reads anonymously, so the token is dropped for the build. Nothing published
# from here needs write access.
RUN sed -i '/npmAuthToken/d; /npmAlwaysAuth/d' .yarnrc.yml

RUN yarn install --immutable

# ---- Build image ----
FROM dependencies AS build

WORKDIR /app

COPY --chown=hmcts:hmcts tsconfig.json vite.config.ts vitest.config.ts biome.json ./
COPY --chown=hmcts:hmcts src ./src
COPY --chown=hmcts:hmcts config ./config

RUN yarn build

# ---- Development image ----
FROM dependencies AS development

WORKDIR /app
USER root
RUN apk add --no-cache bash
USER hmcts

COPY --chown=hmcts:hmcts . .

ENV NODE_ENV=development

# ---- Runtime image ----
FROM base AS runtime

WORKDIR /app
USER root
RUN chown -R hmcts:hmcts /app
USER hmcts

COPY --chown=hmcts:hmcts package.json yarn.lock .yarnrc.yml ./
RUN sed -i '/npmAuthToken/d; /npmAlwaysAuth/d' .yarnrc.yml

ENV NODE_ENV=production
RUN yarn workspaces focus --production 2>/dev/null || yarn install --immutable

# `yarn build` already put the templates and the compiled assets under dist/ (build:views
# copies every non-.ts file out of src/pages, build:assets writes dist/assets), so dist is
# the whole application.
COPY --from=build /app/dist ./dist
COPY --from=build /app/config ./config
# getPropertiesVolumeSecrets reads nodejs.keyVaults out of the chart values to know which Key
# Vault secrets to load from the mounted properties volume, so the chart ships in the image.
# See src/app.ts.
COPY --chown=hmcts:hmcts charts ./charts

EXPOSE 3211

# --conditions=production is what makes the `#lib` subpath imports resolve to dist/libs/*
# rather than to the TypeScript sources, which are not in this image.
CMD ["node", "--conditions=production", "dist/server.js"]
