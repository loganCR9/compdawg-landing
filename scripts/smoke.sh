#!/usr/bin/env bash
#
# Production smoke test for the Compdawg landing site.
#
# Curls the key live URLs and checks the HTTP status plus one expected string in
# each response. Prints PASS/FAIL per check and exits 1 if any check fails.
#
# Read-only: it only issues GET requests. No POSTs, no signups, no auth.
#
# Usage:
#   scripts/smoke.sh                 # check production (https://compdawg.com)
#   BASE_URL=https://preview.pages.dev scripts/smoke.sh   # check a preview
#
# Environment:
#   BASE_URL   Landing origin to test. Default https://compdawg.com
#   APP_URL    App origin for the login check. Default https://app.compdawg.com
#   WWW_URL    www host for the redirect check. Default https://www.compdawg.com
#
# When BASE_URL is overridden (a preview build) the www-redirect and app-login
# checks are skipped by default, because they are specific to the production
# hostnames. Set APP_URL / WWW_URL explicitly to force them.

set -u

BASE_URL="${BASE_URL:-https://compdawg.com}"
DEFAULT_BASE="https://compdawg.com"
APP_URL_DEFAULT="https://app.compdawg.com"
WWW_URL_DEFAULT="https://www.compdawg.com"

# Strip any trailing slash from BASE_URL for consistent joining.
BASE_URL="${BASE_URL%/}"

pass=0
fail=0

tmpbody="$(mktemp)"
tmphdr="$(mktemp)"
cleanup() { rm -f "$tmpbody" "$tmphdr"; }
trap cleanup EXIT

CURL_OPTS=(--silent --show-error --max-time 20 --user-agent "compdawg-smoke/1.0")

report() {
  # report <PASS|FAIL> <name> <detail>
  if [ "$1" = "PASS" ]; then
    printf 'PASS  %-26s %s\n' "$2" "$3"
    pass=$((pass + 1))
  else
    printf 'FAIL  %-26s %s\n' "$2" "$3"
    fail=$((fail + 1))
  fi
}

# check_body <name> <url> <expected_status> <expected_text> [extra curl args...]
check_body() {
  local name="$1" url="$2" want_status="$3" want_text="$4"
  shift 4
  local code
  code="$(curl "${CURL_OPTS[@]}" "$@" -o "$tmpbody" -w '%{http_code}' "$url" 2>"$tmphdr")" || {
    report FAIL "$name" "request error: $(tr '\n' ' ' <"$tmphdr")"
    return
  }
  if [ "$code" != "$want_status" ]; then
    report FAIL "$name" "$url -> HTTP $code (wanted $want_status)"
    return
  fi
  if ! grep -qiF -- "$want_text" "$tmpbody"; then
    report FAIL "$name" "$url HTTP $code but missing text: \"$want_text\""
    return
  fi
  report PASS "$name" "$url -> HTTP $code, found \"$want_text\""
}

# check_redirect <name> <url> <expected_status> <expected_location>
check_redirect() {
  local name="$1" url="$2" want_status="$3" want_loc="$4"
  local code loc
  code="$(curl "${CURL_OPTS[@]}" -o /dev/null -D "$tmphdr" -w '%{http_code}' "$url" 2>/dev/null)" || {
    report FAIL "$name" "request error contacting $url"
    return
  }
  loc="$(awk 'tolower($1)=="location:"{print $2}' "$tmphdr" | tr -d '\r' | tail -1)"
  if [ "$code" != "$want_status" ]; then
    report FAIL "$name" "$url -> HTTP $code (wanted $want_status)"
    return
  fi
  case "$loc" in
    "$want_loc"|"$want_loc"/) report PASS "$name" "$url -> HTTP $code, Location $loc" ;;
    *) report FAIL "$name" "$url HTTP $code but Location \"$loc\" != \"$want_loc\"" ;;
  esac
}

echo "Smoke test against $BASE_URL"
echo

# 1. Home page.
check_body "home" "$BASE_URL/" "200" "Know everything your competitors are doing"

# 2. 404 page (unknown path). Served by Cloudflare Pages / GitHub Pages 404.html.
check_body "not-found" "$BASE_URL/this-path-should-not-exist-9f3a1c" "404" "could not find the page"

# Production-only checks: the www redirect (functions/_middleware) and the app
# login page. Run them when testing the default production origin, or whenever
# the caller has set the matching URL explicitly.
if [ "$BASE_URL" = "$DEFAULT_BASE" ] || [ -n "${WWW_URL:-}" ]; then
  WWW_URL="${WWW_URL:-$WWW_URL_DEFAULT}"
  # 3. www -> apex 301 redirect (Cloudflare Pages Function).
  check_redirect "www-redirect" "$WWW_URL/" "301" "https://compdawg.com/"
else
  report PASS "www-redirect" "skipped (not the production origin)"
fi

if [ "$BASE_URL" = "$DEFAULT_BASE" ] || [ -n "${APP_URL:-}" ]; then
  APP_URL="${APP_URL:-$APP_URL_DEFAULT}"
  # 4. App login page reachable.
  check_body "app-login" "$APP_URL/login" "200" "Compdawg" --location
else
  report PASS "app-login" "skipped (not the production origin)"
fi

echo
echo "Summary: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
