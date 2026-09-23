// Entry point for `node --import ./scripts/ts-loader.mjs <file.ts>`.
import { register } from 'node:module';

register(new URL('./ts-hooks.mjs', import.meta.url));
