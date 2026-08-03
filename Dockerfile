FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# NEXT_PUBLIC_* vars must be present at build time for Next.js to inline them.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SHOW_DEV_TOOLS

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SHOW_DEV_TOOLS=$NEXT_PUBLIC_SHOW_DEV_TOOLS

RUN npm run build

# ── Production runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Admin runs on port 4000 (defined in package.json "start": "next start -p 4000")
EXPOSE 4000

CMD ["node", "server.js"]
