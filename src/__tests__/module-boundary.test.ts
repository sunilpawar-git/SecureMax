/**
 * Module boundary enforcement.
 *
 * Root cause of the landing-page flickering bug: a file in src/components/
 * imported from src/app/(app)/questionnaire/.  In Next.js webpack dev mode
 * the RSC loader wraps every src/app/ file in a lazy client-reference proxy
 * when imported from outside that tree.  That proxy resolves to `undefined`,
 * producing the repeating runtime error:
 *
 *   "Element type is invalid. Received a promise that resolves to: undefined."
 *
 * This test catches violations statically so the bug can never reach the browser.
 *
 * Rule: src/components/**  and  src/lib/**  must NOT import from  src/app/**
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../');
const SRC = path.join(ROOT, 'src');
const APP_DIR = path.join(SRC, 'app');

const RESTRICTED_DIRS = [
  path.join(SRC, 'components'),
  path.join(SRC, 'lib'),
];

const IMPORT_RE = /from\s+['"]([^'"]+)['"]/g;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    if (/\.(ts|tsx)$/.test(e.name)) return [full];
    return [];
  });
}

function importsFromApp(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const hits: string[] = [];
  let m: RegExpExecArray | null;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const spec = m[1];
    let resolved: string | null = null;
    if (spec.startsWith('@/')) {
      resolved = path.join(SRC, spec.slice(2));
    } else if (spec.startsWith('.')) {
      resolved = path.resolve(path.dirname(file), spec);
    }
    if (resolved && resolved.startsWith(APP_DIR + path.sep)) {
      hits.push(spec);
    }
  }
  return hits;
}

describe('Module boundary — shared code must not import from src/app/', () => {
  let violations: { file: string; specifier: string }[];

  beforeAll(() => {
    violations = [];
    for (const dir of RESTRICTED_DIRS) {
      for (const file of walk(dir)) {
        if (file.includes('__tests__')) continue; // test files may mock app modules
        for (const specifier of importsFromApp(file)) {
          violations.push({ file: path.relative(ROOT, file), specifier });
        }
      }
    }
  });

  it('has no file in components/ or lib/ that imports from app/', () => {
    if (violations.length === 0) {
      expect(violations).toHaveLength(0);
      return;
    }
    const lines = violations.map((v) => `  ${v.file}  →  "${v.specifier}"`);
    throw new Error(
      `Boundary violation — move the shared module out of src/app/:\n${lines.join('\n')}`,
    );
  });
});
