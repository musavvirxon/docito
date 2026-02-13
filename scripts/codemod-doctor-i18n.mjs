// File: scripts/codemod-doctor-i18n.mjs
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".git", ".next", ".turbo"].includes(entry.name)) continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function applyReplacements(filePath, input) {
  let text = input;
  let changed = false;

  const rel = path.relative(projectRoot, filePath).replaceAll("\\", "/");

  const replaceAll = (pattern, replacement) => {
    const next = text.replace(pattern, replacement);
    if (next !== text) {
      text = next;
      changed = true;
    }
  };

  if (rel === "src/pages/DoctorDashboard.tsx") {
    replaceAll(/useTranslation\(\s*["']dashboard["']\s*\)/g, 'useTranslation(["doctor", "auth"])');
    replaceAll(/t\(\s*["']doctor\.upcomingAppointments["']\s*\)/g, 't("doctor.upcomingAppointments.title")');
    replaceAll(/t\(\s*["']auth\.logout["']\s*\)/g, 't("auth:logout")');
  } else {
    if (rel.startsWith("src/components/doctor/") && !rel.includes("/public/")) {
      replaceAll(/useTranslation\(\s*["']dashboard["']\s*\)/g, 'useTranslation("doctor")');

      if (text.includes("useTranslation()") && text.match(/\bt\(\s*["']doctor\./)) {
        replaceAll(/useTranslation\(\s*\)/g, 'useTranslation("doctor")');
      }

      replaceAll(/t\(\s*["']doctor\.settings\.account["']\s*\)/g, 't("doctor.settings.account.title")');
      replaceAll(/t\(\s*["']doctor\.settings\.calendar["']\s*\)/g, 't("doctor.settings.calendar.title")');
      replaceAll(/t\(\s*["']doctor\.upcomingAppointments["']\s*\)/g, 't("doctor.upcomingAppointments.title")');
    }
  }

  return { text, changed };
}

function main() {
  const targets = new Set();

  targets.add(path.join(projectRoot, "src/pages/DoctorDashboard.tsx"));

  const doctorDir = path.join(projectRoot, "src/components/doctor");
  if (fs.existsSync(doctorDir)) {
    for (const f of walk(doctorDir)) {
      if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
      if (f.replaceAll("\\", "/").includes("/public/")) continue;
      targets.add(f);
    }
  }

  let changedCount = 0;
  for (const filePath of [...targets]) {
    if (!fs.existsSync(filePath)) continue;
    const original = readText(filePath);
    const { text, changed } = applyReplacements(filePath, original);
    if (changed) {
      writeText(filePath, text);
      changedCount++;
      console.log(`[updated] ${path.relative(projectRoot, filePath)}`);
    }
  }

  console.log(`\nDone. Updated ${changedCount} file(s).`);
  console.log(`If you want to revert, use git checkout . or your editor undo.`);
}

main();
