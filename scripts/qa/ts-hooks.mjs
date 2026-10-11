// Lets Node run this project's TypeScript directly, for the unit tests: no bundler, no test
// framework to install. Each .ts or .tsx file is transpiled on the fly by the TypeScript that
// is already a dependency, "@/..." resolves the way tsconfig says, and stylesheets import as nothing.

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve as path } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const ROOT = path(dirname(fileURLToPath(import.meta.url)), "../..");
const ENDINGS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function find(base) {
  for (const end of ENDINGS) {
    const file = base + end;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier.endsWith(".css")) return { url: "data:text/javascript,export default {}", shortCircuit: true };
  let base = null;
  if (specifier.startsWith("@/")) base = path(ROOT, "src", specifier.slice(2));
  else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith("file:")) base = path(dirname(fileURLToPath(context.parentURL)), specifier);
  const file = base && find(base);
  return file ? { url: pathToFileURL(file).href, shortCircuit: true } : next(specifier, context);
}

export async function load(url, context, next) {
  if (!url.startsWith("file:") || !/\.tsx?$/.test(url)) return next(url, context);
  const fileName = fileURLToPath(url);
  const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
    fileName,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, inlineSourceMap: true, inlineSources: true },
  });
  return { format: "module", source: outputText, shortCircuit: true };
}
