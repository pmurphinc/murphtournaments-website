FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg yt-dlp \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
# Vite bakes VITE_* variables into the bundle at build time, and a Docker
# build does not inherit the service's runtime environment. Railway supplies
# matching service variables as build args, but only for names the Dockerfile
# declares, so these two have to be named here or the analytics tag is built
# without them and silently omitted.
ARG VITE_ANALYTICS_ENDPOINT=""
ARG VITE_ANALYTICS_WEBSITE_ID=""
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
# Migrations run from Railway's pre-deploy command, not here.
CMD ["pnpm", "start"]
