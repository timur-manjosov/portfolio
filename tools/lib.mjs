// Shared helpers for the check scripts (Node built-ins only, no dependencies).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function htmlFiles(dist) {
  return walk(dist).filter((f) => f.endsWith(".html"));
}

export function read(path) {
  return readFileSync(path, "utf8");
}

export function rel(dist, path) {
  return `/${relative(dist, path)}`;
}

/** Tiny reporter: collects failures, prints them, sets the exit code. */
export function reporter(name) {
  const failures = [];
  return {
    fail(where, message) {
      failures.push(`${where}: ${message}`);
    },
    done(summary) {
      if (failures.length) {
        console.error(`✗ ${name}: ${failures.length} problem(s)`);
        for (const f of failures) console.error(`  - ${f}`);
        process.exitCode = 1;
      } else {
        console.log(`✓ ${name}: ${summary}`);
      }
    },
  };
}
