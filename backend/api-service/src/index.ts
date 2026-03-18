import { PrismaClient } from "@prisma/client";
import { buildServer } from "./server.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const db = new PrismaClient();
  await db.$connect();

  const app = await buildServer(db);

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`API service running on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    await db.$disconnect();
    process.exit(1);
  }

  const shutdown = async () => {
    console.log("Shutting down...");
    await app.close();
    await db.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
