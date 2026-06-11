FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node src/index.js"]
