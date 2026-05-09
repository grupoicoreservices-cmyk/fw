# Multi-stage build: build React app then serve with Nginx

FROM node:20-alpine AS build
WORKDIR /app

# Install deps (lockfile for reproducible builds)
COPY package.json yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else yarn install; fi

# Build app
COPY . .
# In production the frontend uses RELATIVE /api requests proxied by nginx,
# so REACT_APP_BACKEND_URL is empty in the production build.
ENV REACT_APP_BACKEND_URL=""
ENV WDS_SOCKET_PORT=0
ENV ENABLE_HEALTH_CHECK=false
ENV CI=false
RUN yarn build

# ---- Serve stage ----
FROM nginx:alpine

# Replace default config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static files
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
