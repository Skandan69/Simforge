import "dotenv/config";
import { app } from "./app.js";
import { getEnv } from "./config/env.js";

const { PORT: port } = getEnv();

app.listen(port, () => {
  console.log(`SimForge API listening on http://localhost:${port}`);
});
