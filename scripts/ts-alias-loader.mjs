import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let p = new URL(`../src/${specifier.slice(2)}`, import.meta.url).href;
    if (!existsSync(p) && existsSync(p + ".ts")) p = p + ".ts";
    return { url: p, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
