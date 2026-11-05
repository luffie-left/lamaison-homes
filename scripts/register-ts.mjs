// Minimal Node loader hooks so scripts/test-bookability.mjs can import the
// project's TypeScript sources (extensionless relative imports + "@/" alias)
// with Node's native type stripping. Dev/test only — not used by Next.js.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-resolve-hooks.mjs", pathToFileURL("./scripts/"));
