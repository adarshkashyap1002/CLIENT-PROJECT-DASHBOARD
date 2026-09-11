FROM node:20-alpine
WORKDIR /app

# Prisma's schema engine needs OpenSSL, which the slim alpine image doesn't
# include by default — without this it fails with a cryptic "not valid JSON"
# error instead of a clear "openssl not found" message.
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 4000
# Using `db push` instead of `migrate deploy` because this repo doesn't
# include a prisma/migrations folder (no migration history was generated),
# so `migrate deploy` finds nothing to apply. `db push` builds the tables
# directly from schema.prisma, which is correct for a project at this stage.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
