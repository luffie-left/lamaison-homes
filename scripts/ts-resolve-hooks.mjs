import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function resolve(specifier, context, next) {
  // "@/" → project src/
  if (specifier.startsWith("@/")) {
    const p = path.join(root, "src", specifier.slice(2));
    return resolveWithExt(p, context, next);
  }
  // extensionless relative imports
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier)
  ) {
    const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
    const p = path.resolve(path.dirname(parentPath), specifier);
    return resolveWithExt(p, context, next);
  }
  return next(specifier, context);
}

function resolveWithExt(p, context, next) {
  for (const ext of [".ts", ".tsx", ".js", ".mjs", ".jsx"]) {
    if (existsSync(p + ext)) {
      return next(pathToFileURL(p + ext).href, context);
    }
  }
  return next(pathToFileURL(p).href, context);
}
