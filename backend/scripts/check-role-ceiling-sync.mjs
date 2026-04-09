import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendPath = join(
  __dirname,
  "..",
  "src",
  "auth",
  "data",
  "role-ceiling.json"
);
const frontendPath = join(
  __dirname,
  "..",
  "..",
  "frontend",
  "src",
  "config",
  "role-ceiling.json"
);

if (!existsSync(frontendPath)) {
  console.warn(
    "[check-role-ceiling] frontend/src/config/role-ceiling.json ausente — verificação ignorada."
  );
  process.exit(0);
}

const backend = readFileSync(backendPath, "utf8");
const frontend = readFileSync(frontendPath, "utf8");

if (backend !== frontend) {
  console.error(
    "role-ceiling.json diverge entre backend e frontend.\n" +
      "Copie backend/src/auth/data/role-ceiling.json para frontend/src/config/role-ceiling.json"
  );
  process.exit(1);
}

console.log("role-ceiling.json: backend e frontend alinhados.");
