FROM node:lts-alpine

ENV TZ=UTC

LABEL org.opencontainers.image.source="https://github.com/cssnr/chat-server"
LABEL org.opencontainers.image.description="Proxy Chat Server designed to work with the VitePress Chat plugin."
LABEL org.opencontainers.image.authors="smashedr"

#RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.json ./

RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

COPY src/ ./src/

RUN npm run build

ARG VERSION="Dockerfile"
ENV APP_VERSION="${VERSION}"
LABEL org.opencontainers.image.version="${VERSION}"

USER node

CMD ["npm", "start"]
