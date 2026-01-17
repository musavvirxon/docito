// File: scripts/phase0-audit.mjs
#!/usr/bin/env node
/*
  Phase 0 audit script (no mutations):
  - Lists app routes from src/App.tsx
  - Finds likely mock/hardcoded/demo data patterns
  - Prints summary and writes PHASE0_AUDIT.json

  Run:
    node scripts/phase0-audit.mjs
*/

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function listFiles(dir, exts = null) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    const ents = fs.readdirSync(d, { withFileTypes: true });
    for (const e of ents) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
        stack.push(full);
      } else if (!exts) {
        out.push(full);
      } else {
        const ext = path.extname(e.name).toLowerCase();
        if (exts.includes(ext)) out.push(full);
      }
    }
  }
  return out;
}

function extractRoutes(appTsx) {
  const txt = readText(appTsx);
  const routes = new Set();

  // Extract <Route path="..."> occurrences
  const re = /\bpath=\"([^\"]+)\"/g;
  let m;
  while ((m = re.exec(txt))) {
    routes.add(m[1]);
  }

  // Include index route
  if (txt.includes('<Route index')) routes.add('/');

  return Array.from(routes).sort((a, b) => a.localeCompare(b));
}

const PATTERNS = [
  { id: 'mock_keyword', re: /\bmock\b/i, severity: 'high' },
  { id: 'math_random', re: /Math\.random\(/, severity: 'high' },
  { id: 'coming_soon', re: /coming soon/i, severity: 'medium' },
  { id: 'placeholder', re: /placeholder\.svg|\/placeholder\.svg/i, severity: 'low' },
  { id: 'todo_fixme', re: /\bTODO\b|\bFIXME\b/, severity: 'low' },
];

function scanForPatterns(files) {
  const findings = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const txt = readText(f);
    const lines = txt.split(/\r?\n/);

    for (const p of PATTERNS) {
      let hitCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (p.re.test(lines[i])) {
          hitCount++;
          if (hitCount <= 25) {
            findings.push({
              file: rel,
              line: i + 1,
              pattern: p.id,
              severity: p.severity,
              snippet: lines[i].slice(0, 240),
            });
          }
        }
      }
    }
  }
  return findings;
}

function groupByFile(findings) {
  const map = new Map();
  for (const f of findings) {
    const arr = map.get(f.file) || [];
    arr.push(f);
    map.set(f.file, arr);
  }
  return Array.from(map.entries())
    .map(([file, items]) => ({ file, items: items.sort((a, b) => a.line - b.line) }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function main() {
  const appPath = path.join(ROOT, 'src', 'App.tsx');
  const routes = fs.existsSync(appPath) ? extractRoutes(appPath) : [];

  const srcFiles = listFiles(path.join(ROOT, 'src'), ['.ts', '.tsx', '.js', '.jsx', '.json']);
  const supaFiles = fs.existsSync(path.join(ROOT, 'supabase'))
    ? listFiles(path.join(ROOT, 'supabase'), ['.ts', '.sql', '.json', '.toml'])
    : [];

  const findings = scanForPatterns([...srcFiles, ...supaFiles]);
  const grouped = groupByFile(findings);

  const out = {
    generated_at: new Date().toISOString(),
    routes,
    findings_count: findings.length,
    findings_by_file: grouped,
  };

  fs.writeFileSync(path.join(ROOT, 'PHASE0_AUDIT.json'), JSON.stringify(out, null, 2));

  // Console summary
  console.log('Phase 0 audit complete');
  console.log('Routes:', routes.length);
  console.log('Findings:', findings.length);
  const top = grouped
    .map((g) => ({ file: g.file, count: g.items.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  if (top.length) {
    console.log('\nTop files with findings:');
    for (const t of top) console.log(`- ${t.count.toString().padStart(3, ' ')}  ${t.file}`);
  }
  console.log('\nWrote PHASE0_AUDIT.json');
}

main();
