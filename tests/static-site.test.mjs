import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "index.html",
  "404.html",
  ".nojekyll",
  "assets/styles.css",
  "assets/sample-report.css",
  "assets/app.js",
  "assets/signup.js",
  "assets/sample-report.js",
  "functions/_middleware.js"
];

test("static landing files are present", () => {
  for (const file of required) {
    assert.equal(existsSync(join(root, file)), true, file);
  }
});

test("local html asset references resolve on disk", () => {
  for (const page of ["index.html", "404.html"]) {
    const html = readFileSync(join(root, page), "utf8");
    const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(refs.length > 0, page);
    for (const ref of refs) {
      if (/^(https?:|#|mailto:)/.test(ref) || ref === "./") continue;
      const path = ref.split(/[?#]/)[0];
      assert.equal(path.startsWith("/"), false, `${page} uses a root path ${ref}`);
      assert.equal(existsSync(join(root, path)), true, `${page} missing ${ref}`);
    }
  }
});
