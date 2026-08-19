# Dockerfile para la landing de Carpintería (Next.js) — estática
# Multi-stage: instala deps, hace build (NEXT_PUBLIC_* en build-time) y corre `next start`.
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_INSTAGRAM_HANDLE
ARG NEXT_PUBLIC_EMAIL
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
ENV NEXT_PUBLIC_INSTAGRAM_HANDLE=$NEXT_PUBLIC_INSTAGRAM_HANDLE
ENV NEXT_PUBLIC_EMAIL=$NEXT_PUBLIC_EMAIL
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]