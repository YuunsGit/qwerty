FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install

RUN apt-get update && \
    apt-get install -y chromium && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ARG PORT
EXPOSE ${PORT:-8000}

CMD ["bun", "index.ts"]
