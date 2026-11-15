#!/usr/bin/env node
// Copy check for the Compdawg landing site.
// Scans user-visible text in *.html and copy strings in functions/*.js against
// Logan's copy-blacklist house standard (see scripts/copy-rules.json, derived
// from the copy-blacklist skill). Exits 1 on any hit so CI fails the build.
//
// No third-party dependencies. Run: node scripts/copy-check.mjs
//
// What counts as user-visible text in HTML:
//   - text nodes (outside <script> and <style>)
//   - the alt, title, aria-label, and placeholder attributes
//   - <title> text and meta description / og / twitter copy
// In functions/*.js: the contents of string and template literals.

import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const rules = JSON.parse(readFileSync(join(here, "copy-rules.json"), "utf8"));
const allowlist = JSON.parse(readFileSync(join(here, "copy-allowlist.json"), "utf8")).allow || [];

// ---------------------------------------------------------------- utilities

const EM_DASH = "—";

// Decode the handful of HTML entities that appear in real copy, and normalise
// curly quotes to straight ones so phrase matching is predictable.
function decodeEntities(text) {
  return text
    .replace(/&mdash;/g, EM_DASH)
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/gi, "'")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build an inflection-aware regex fragment for a single banned word.
// Handles plurals and -ed / -ing, including the leverage -> leveraging case.
function wordVariants(word) {
  if (/[^a-z]/i.test(word)) {
    // Hyphenated or multi-token entries (cutting-edge, data-driven): match literally.
    return escapeRegExp(word);
  }
  const forms = new Set([word, word + "s", word + "es", word + "ed", word + "ing", word + "d"]);
  if (word.endsWith("e")) {
    const stem = word.slice(0, -1);
    forms.add(stem + "ing"); // leverage -> leveraging
    forms.add(stem + "ed"); // leverage -> leveraged (also covered by +d)
  }
  if (word.endsWith("y")) {
    const stem = word.slice(0, -1);
    forms.add(stem + "ies");
    forms.add(stem + "ied");
  }
  return [...forms].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
}

// Boundary that treats hyphens as part of a word so "cutting-edge" is not found
// inside "cutting" and "leading-edge" matches cleanly.
function boundedWord(fragment) {
  return new RegExp(`(?<![A-Za-z0-9])(?:${fragment})(?![A-Za-z0-9])`, "gi");
}

function boundedPhrase(phrase) {
  // Phrase may contain spaces and punctuation; collapse whitespace to \s+.
  const frag = escapeRegExp(phrase).replace(/\\?\s+/g, "\\s+");
  const startsAlnum = /^[A-Za-z0-9]/.test(phrase);
  const endsAlnum = /[A-Za-z0-9]$/.test(phrase);
  const pre = startsAlnum ? "(?<![A-Za-z0-9])" : "";
  const post = endsAlnum ? "(?![A-Za-z0-9])" : "";
  return new RegExp(`${pre}${frag}${post}`, "gi");
}

// Precompile matchers.
const wordMatchers = rules.words.map((w) => ({ rule: "word", label: w, re: boundedWord(wordVariants(w)) }));
const copulativeMatchers = rules.copulatives.map((p) => ({ rule: "copulative", label: p, re: boundedPhrase(p) }));
const phraseMatchers = rules.phrases.map((p) => ({ rule: "phrase", label: p, re: boundedPhrase(p) }));
const transitionMatchers = rules.deadTransitions.map((p) => ({ rule: "deadTransition", label: p, re: boundedPhrase(p) }));
const baitMatchers = rules.engagementBait.map((p) => ({ rule: "engagementBait", label: p, re: boundedPhrase(p) }));
const hypeMatchers = rules.hype.map((p) => ({ rule: "hype", label: p, re: boundedPhrase(p) }));
const hypePatternMatchers = (rules.hypePatterns || []).map((p) => ({ rule: "hype", label: p, re: boundedPhrase(p) }));

const textMatchers = [
  ...wordMatchers,
  ...copulativeMatchers,
  ...phraseMatchers,
  ...transitionMatchers,
  ...baitMatchers,
  ...hypeMatchers,
  ...hypePatternMatchers
];

// The Oxford-comma heuristic is deliberately conservative: real prose throws up
// far more "X, Y and Z" fragments that are clauses or two-item phrases than it
// does genuine missing commas, and the brief asks for low false positives. So we
// only flag "A, B and C" when all three read like parallel list items (short,
// bare noun phrases with no clause words, prepositions, or verb participles),
// and we skip cases where the pair was really one compound item inside a larger,
// correctly punctuated list ("monitoring, summaries and reports, and analysis").

// Words that signal a relative clause rather than a simple list item.
const CLAUSE_STOPWORDS = new RegExp(
  "\\b(who|whom|whose|which|that|this|these|those|was|were|is|are|am|be|been|being|" +
    "has|have|had|will|would|can|could|should|may|might|do|does|did|when|where|while|" +
    "because|so|then|if)\\b",
  "i"
);
// A leading preposition means the phrase modifies something, not a list item.
const LEADING_PREP = new RegExp(
  "^(from|by|to|of|for|with|before|after|across|into|about|over|under|through|on|in|" +
    "at|as|than|like|per|via|within|without|upon|off|out|up|down|around|between)\\b",
  "i"
);
// A verb participle (researched, compared, captured, running) marks a clause.
const PARTICIPLE = /\b[\w'-]{2,}(?:ed|ing)\b/i;

function badListItem(item) {
  const t = item.trim();
  if (!t) return true;
  if (LEADING_PREP.test(t)) return true;
  if (PARTICIPLE.test(t)) return true;
  return false;
}

// Flag "A, B and C" / "A, B or C" style lists that drop the Oxford comma.
const OXFORD_RE = /([A-Za-z0-9][\w'-]*(?:\s+[\w'-]+){0,2}),\s+([\w'-]+(?:\s+[\w'-]+){0,2})\s+(and|or)\s+([\w'-]+(?:\s+[\w'-]+){0,2})/g;

function findOxford(text) {
  const hits = [];
  for (const m of text.matchAll(OXFORD_RE)) {
    const [span, a, b, conj, c] = m;
    if (CLAUSE_STOPWORDS.test(span)) continue;
    if (badListItem(a) || badListItem(b) || badListItem(c)) continue;
    // Compound item inside a properly punctuated outer list: "B and C, and D".
    const after = text.slice(m.index + span.length, m.index + span.length + 8);
    if (/^\s*,\s*(and|or)\b/i.test(after)) continue;
    hits.push({ rule: "oxford", label: `${conj} without Oxford comma`, match: span, index: m.index });
  }
  return hits;
}

// ---------------------------------------------------------------- allowlisting

function isAllowed(file, rule, matchText) {
  const m = matchText.toLowerCase();
  return allowlist.some((entry) => {
    const fileOk = !entry.file || entry.file === "*" || entry.file === file;
    const ruleOk = !entry.rule || entry.rule === "*" || entry.rule === rule;
    const matchOk = entry.match != null && entry.match.toLowerCase() === m;
    return fileOk && ruleOk && matchOk;
  });
}

// ---------------------------------------------------------------- segments

// A segment is a run of copy with a 1-based source line number.
function lineAt(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") line++;
  }
  return line;
}

const META_COPY = /(^|\s)(name|property)\s*=\s*["'](description|og:title|og:description|og:image:alt|twitter:title|twitter:description)["']/i;
const COPY_ATTRS = ["alt", "title", "aria-label", "placeholder"];

// Extract copy segments from an HTML string: text nodes plus selected
// attributes, each tagged with the source line where it begins.
function htmlSegments(source) {
  const segments = [];
  let i = 0;
  const n = source.length;
  let textStart = -1;
  let textBuf = "";

  const flushText = () => {
    if (textBuf.trim()) {
      segments.push({ text: decodeEntities(textBuf), line: lineAt(source, textStart) });
    }
    textBuf = "";
    textStart = -1;
  };

  while (i < n) {
    if (source.startsWith("<!--", i)) {
      flushText();
      const end = source.indexOf("-->", i + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    const lower = source.slice(i, i + 8).toLowerCase();
    if (lower.startsWith("<script") || lower.startsWith("<style")) {
      flushText();
      const tag = lower.startsWith("<script") ? "script" : "style";
      const close = source.toLowerCase().indexOf(`</${tag}>`, i);
      i = close === -1 ? n : close + tag.length + 3;
      continue;
    }
    if (source[i] === "<") {
      flushText();
      const end = source.indexOf(">", i);
      const tag = source.slice(i, end === -1 ? n : end + 1);
      const tagLine = lineAt(source, i);
      // Pull copy-bearing attributes out of the tag.
      for (const attr of COPY_ATTRS) {
        const re = new RegExp(`\\b${attr}\\s*=\\s*("([^"]*)"|'([^']*)')`, "gi");
        let am;
        while ((am = re.exec(tag)) !== null) {
          const val = am[2] !== undefined ? am[2] : am[3];
          if (val && val.trim()) segments.push({ text: decodeEntities(val), line: tagLine });
        }
      }
      // Meta copy (description / og / twitter).
      if (/^<meta\b/i.test(tag) && META_COPY.test(tag)) {
        const cm = /\bcontent\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag);
        if (cm) {
          const val = cm[2] !== undefined ? cm[2] : cm[3];
          if (val && val.trim()) segments.push({ text: decodeEntities(val), line: tagLine });
        }
      }
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (textStart === -1) textStart = i;
    textBuf += source[i];
    i++;
  }
  flushText();
  return segments;
}

// Extract string / template literal contents from a JS source, line-tagged.
function jsSegments(source) {
  const segments = [];
  const lines = source.split("\n");
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  lines.forEach((line, idx) => {
    let m;
    while ((m = re.exec(line)) !== null) {
      const val = m[1] ?? m[2] ?? m[3] ?? "";
      if (val.trim()) segments.push({ text: val, line: idx + 1 });
    }
  });
  return segments;
}

// ---------------------------------------------------------------- scanning

function scanSegment(file, seg, findings) {
  const { text, line } = seg;

  // Dash rules.
  let di = text.indexOf(EM_DASH);
  if (di !== -1 && !isAllowed(file, "emDash", EM_DASH)) {
    findings.push(mkFinding(file, line, "emDash", "em dash (U+2014)", text, di));
  }
  const dashSpace = text.indexOf(" -- ");
  if (dashSpace !== -1 && !isAllowed(file, "emDash", "--")) {
    findings.push(mkFinding(file, line, "emDash", "double hyphen used as a dash", text, dashSpace));
  }

  // Word / phrase rules.
  for (const matcher of textMatchers) {
    matcher.re.lastIndex = 0;
    let m;
    while ((m = matcher.re.exec(text)) !== null) {
      if (isAllowed(file, matcher.rule, m[0])) continue;
      findings.push(mkFinding(file, line, matcher.rule, matcher.label, text, m.index, m[0]));
      if (m.index === matcher.re.lastIndex) matcher.re.lastIndex++;
    }
  }

  // Oxford comma.
  for (const h of findOxford(text)) {
    if (isAllowed(file, "oxford", h.match)) continue;
    findings.push(mkFinding(file, line, "oxford", h.label, text, h.index, h.match));
  }
}

function mkFinding(file, line, rule, label, text, index, matched) {
  const start = Math.max(0, index - 32);
  const end = Math.min(text.length, index + (matched ? matched.length : 1) + 32);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return { file, line, rule, label, match: matched || label, snippet };
}

// ---------------------------------------------------------------- main

function listFiles() {
  // Explicit paths on the command line override the default set (handy for
  // checking a single file or a test fixture).
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  if (args.length) {
    return {
      htmlFiles: args.filter((a) => a.endsWith(".html")),
      fnFiles: args.filter((a) => /\.(m?js)$/.test(a))
    };
  }
  const htmlFiles = ["index.html", "404.html"];
  const fnFiles = ["functions/_middleware.js"];
  return { htmlFiles, fnFiles };
}

function run() {
  const { htmlFiles, fnFiles } = listFiles();
  const findings = [];

  for (const rel of htmlFiles) {
    const full = isAbsolute(rel) ? rel : join(root, rel);
    let src;
    try {
      src = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    for (const seg of htmlSegments(src)) scanSegment(rel, seg, findings);
  }

  for (const rel of fnFiles) {
    const full = isAbsolute(rel) ? rel : join(root, rel);
    let src;
    try {
      src = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    for (const seg of jsSegments(src)) scanSegment(rel, seg, findings);
  }

  findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));

  if (findings.length === 0) {
    console.log("copy-check: no banned copy found.");
    return 0;
  }

  console.error(`copy-check: ${findings.length} issue(s) found\n`);
  for (const f of findings) {
    console.error(`${f.file}:${f.line}  [${f.rule}] ${f.label}`);
    console.error(`    match: "${f.match}"`);
    console.error(`    copy:  ${f.snippet}\n`);
  }
  return 1;
}

process.exit(run());
