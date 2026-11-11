import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Custom ESM loader hook to resolve 'three' to mock_three.js when running in
 * headless CI environments without node_modules or npm.
 * Also checks NODE_PATH if provided.
 */
export function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    if (process.env.NODE_PATH) {
      for (const dir of process.env.NODE_PATH.split(path.delimiter)) {
        if (!dir) continue;
        const candidatePkg = path.join(dir, 'three', 'package.json');
        const candidateIdx = path.join(dir, 'three', 'index.js');
        const candidateFile = path.join(dir, 'three.js');
        if (fs.existsSync(candidatePkg)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(candidatePkg, 'utf8'));
            const entry = pkg.module || pkg.main || 'index.js';
            return {
              shortCircuit: true,
              url: pathToFileURL(path.join(dir, 'three', entry)).href
            };
          } catch (_) {}
        }
        if (fs.existsSync(candidateIdx)) {
          return { shortCircuit: true, url: pathToFileURL(candidateIdx).href };
        }
        if (fs.existsSync(candidateFile)) {
          return { shortCircuit: true, url: pathToFileURL(candidateFile).href };
        }
      }
    }
    return {
      shortCircuit: true,
      url: new URL('./mock_three.js', import.meta.url).href
    };
  }
  return nextResolve(specifier, context);
}
