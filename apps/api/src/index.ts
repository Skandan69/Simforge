import "dotenv/config";
import { app } from "./app.js";
import { getEnv } from "./config/env.js";
import { startProcessingWorker } from "./processing/worker.js";
import { enforceApiOwnedTableSecurity } from "./security/database-hardening.js";

const env = getEnv();

async function start() {
  if (env.NODE_ENV === "production") {
    await enforceApiOwnedTableSecurity();
    console.log("SimForge database security hardening verified.");
  }

  app.listen(env.PORT, () => {
    console.log(`SimForge API listening on http://localhost:${env.PORT}`);
  });
  startProcessingWorker();
}

start().catch((error) => {
  console.error("SimForge API failed to start.", error);
  process.exit(1);
});
