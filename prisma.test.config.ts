import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Configure TEST_DATABASE_URL com um banco descartável cujo nome termine em _test.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});
