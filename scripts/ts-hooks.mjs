/**
 * Node module hooks that let the project's TypeScript run directly.
 *
 * The rules in `src/core` are plain TypeScript with no React Native imports,
 * which is what makes them testable. Rather than add a build step or a second
 * toolchain, these hooks resolve extensionless relative imports and transpile
 * TypeScript with the compiler that is already a dev dependency.
 */

import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';

const TS_EXTENSIONS = ['.ts', '.tsx'];
const CANDIDATE_SUFFIXES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(specifier, context, nextResolve) {
  const relative =
    specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/');
  if (relative && context.parentURL?.startsWith('file:')) {
    const parentPath = fileURLToPath(context.parentURL);
    const base = path.resolve(path.dirname(parentPath), specifier);
    for (const suffix of CANDIDATE_SUFFIXES) {
      const candidate = `${base}${suffix}`;
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (TS_EXTENSIONS.some((extension) => url.endsWith(extension))) {
    const fileName = fileURLToPath(url);
    const source = await readFile(fileName, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      fileName,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.ReactJSX,
        isolatedModules: true,
        esModuleInterop: true,
        sourceMap: false,
      },
    });
    return { format: 'module', source: outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
