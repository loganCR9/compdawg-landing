import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const signup = require("../assets/signup.js");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/styles.css", import.meta.url), "utf8");
const appJs = readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
const signupJs = readFileSync(new URL("../assets/signup.js", import.meta.url), "utf8");

test("paid prices are flat monthly amounts and free stays free", () => {
  assert.match(html, /<b>\$2,000<\/b><span>per month<\/span>/);
  assert.match(html, /<b>\$5,000<\/b><span>per month<\/span>/);
  assert.match(html, /Core \$2,000\/month and Strategic \$5,000\/month/);
  assert.doesNotMatch(html, /From \$/);
  assert.match(html, /for \$2,000 per month/);
  assert.match(html, /Core costs \$2,000 per month/);
  assert.match(html, /for \$5,000 per month/);
  assert.match(html, /Strategic costs \$5,000 per month/);
  assert.match(html, /<b>\$0<\/b><span>no card needed<\/span>/);
  assert.doesNotMatch(html, /1,?999|4,?999/);
  assert.doesNotMatch(html, /starting at|starts at|Starting at|plan-price-prefix/i);
  assert.doesNotMatch(css, /plan-price-prefix/);
});

test("signup controls open the dialog and strategic calls stay on their links", () => {
  const lines = html.split("\n");
  const signupLines = lines.filter((line) => line.includes("app.compdawg.com/signup"));
  assert.equal(signupLines.length, 15);
  signupLines.forEach((line) => assert.match(line, /data-signup-open/));
  const callLines = lines.filter((line) => line.includes("typeform.com"));
  assert.equal(callLines.length, 6);
  callLines.forEach((line) => {
    assert.equal(line.includes("data-signup-open"), false);
    assert.match(line, /https:\/\/form\.typeform\.com\/to\/XvtHPkwo/);
  });
  assert.match(html, /id="signup-dialog"/);
  assert.match(html, /Work email/);
  assert.match(html, /Password \(at least 12 characters\)/);
  assert.match(html, /Create account/);
  assert.match(html, /href="https:\/\/app\.compdawg\.com\/login">Sign in/);
  assert.match(html, /brand\/logo-lockup-sm-t\.png/);
  assert.doesNotMatch(html, /compdawg-lockup\.png/);
});

test("new copy keeps the landing punctuation rules", () => {
  const fresh = [signupJs, appJs.slice(appJs.indexOf("Signup stays on this page"))];
  fresh.forEach((source) => {
    assert.equal(source.includes("\u2014"), false);
    assert.equal(source.includes("\u2013"), false);
  });
});

test("client validation matches the public signup errors", () => {
  assert.deepEqual(signup.validateSignup("not-an-email", "short"), {
    ok: false,
    fields: ["email"],
    message: "Enter a valid work email and a password."
  });
  assert.deepEqual(signup.validateSignup("person@example.com", "short"), {
    ok: false,
    fields: ["password"],
    message: "Use at least 12 characters."
  });
  const trimmed = signup.validateSignup("  person@example.com  ", "x".repeat(12));
  assert.equal(trimmed.ok, true);
  assert.equal(trimmed.email, "person@example.com");
  assert.equal(trimmed.password.length, 12);
});

test("submit uses the app endpoint and shows server errors without storing the secret", async () => {
  let calls = 0;
  const invalid = await signup.submitSignup({ email: "person@example.com", password: "short" }, () => {
    calls += 1;
    throw new Error("fetch should not run");
  });
  assert.equal(invalid.ok, false);
  assert.equal(calls, 0);
  assert.equal(Object.hasOwn(invalid, "password"), false);

  const secret = "x".repeat(12);
  const denied = await signup.submitSignup({ email: "person@gmail.com", password: secret }, async (url, init) => {
    calls += 1;
    assert.equal(url, "https://app.compdawg.com/api/auth/signup");
    assert.equal(init.method, "POST");
    assert.equal(init.credentials, "include");
    assert.equal(init.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(init.body), { email: "person@gmail.com", password: secret });
    return {
      ok: false,
      status: 400,
      json: async () => ({ error: "Use your work email, like you@yourcompany.com" })
    };
  });
  assert.equal(calls, 1);
  assert.deepEqual(denied, {
    ok: false,
    kind: "error",
    status: 400,
    fields: ["email"],
    message: "Use your work email, like you@yourcompany.com"
  });

  const created = await signup.submitSignup({ email: "person@example.com", password: secret }, async () => ({
    ok: true,
    status: 200,
    json: async () => ({})
  }));
  assert.deepEqual(created, { ok: true, kind: "ok", welcomeUrl: "https://app.compdawg.com/welcome" });

  const offline = await signup.submitSignup({ email: "person@example.com", password: secret }, async () => {
    throw new TypeError("Failed to fetch");
  });
  assert.equal(offline.kind, "network");
  assert.equal(offline.message, signup.NETWORK_MESSAGE);
  assert.equal(JSON.stringify(offline).includes(secret), false);
});

test("signup code does not persist credentials in browser storage", () => {
  const combined = signupJs + appJs;
  assert.equal(/localStorage|sessionStorage|indexedDB|gtag|analytics/i.test(combined), false);
  assert.match(signupJs, /credentials:\s*"include"/);
  assert.match(appJs, /window\.location\.assign\(result\.welcomeUrl\)/);
  assert.match(appJs, /signupPending/);
});
