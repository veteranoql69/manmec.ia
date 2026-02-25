// Prisma 7 config — Manmec IA
// Carga .env.local (Next.js convention) para que DATABASE_URL esté disponible
import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
