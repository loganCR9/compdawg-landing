/* Compdawg landing signup contract.
   The app creates accounts with POST https://app.compdawg.com/api/auth/signup
   and a JSON body of { email, password }. The session is an HTTP-only cookie
   on the app host, so the browser must send credentials. This file does not
   store the email or password, and it does not read document cookies.
   A cross-origin call from https://compdawg.com currently fails in the browser
   until that route allows this origin with credentials. Do not work around that
   by proxying the password or rewriting the session cookie. */
(function (root) {
  "use strict";

  var SIGNUP_ENDPOINT = "https://app.compdawg.com/api/auth/signup";
  var WELCOME_URL = "https://app.compdawg.com/welcome";
  var NETWORK_MESSAGE = "We could not create the account. Your details are still here, so you can try again.";

  function normalizeEmail(email) {
    return String(email == null ? "" : email).trim();
  }

  function validateSignup(email, password) {
    var cleaned = normalizeEmail(email);
    var secret = String(password == null ? "" : password);
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
    if (!emailOk || !secret) {
      var fields = [];
      if (!emailOk) fields.push("email");
      if (!secret) fields.push("password");
      return { ok: false, fields: fields, message: "Enter a valid work email and a password." };
    }
    if (secret.length < 12) {
      return { ok: false, fields: ["password"], message: "Use at least 12 characters." };
    }
    return { ok: true, email: cleaned, password: secret };
  }

  function fieldsForMessage(message) {
    var fields = [];
    var text = String(message || "");
    if (/email/i.test(text)) fields.push("email");
    if (/password|12 characters/i.test(text)) fields.push("password");
    return fields;
  }

  function messageFromBody(body) {
    if (body && typeof body.error === "string" && body.error.trim()) return body.error.trim();
    return "Something went wrong";
  }

  function signupInit(email, password) {
    return {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ email: email, password: password })
    };
  }

  async function submitSignup(fields, fetchImpl) {
    var check = validateSignup(fields && fields.email, fields && fields.password);
    if (!check.ok) {
      return { ok: false, kind: "invalid", fields: check.fields, message: check.message };
    }
    try {
      var res = await fetchImpl(SIGNUP_ENDPOINT, signupInit(check.email, check.password));
      var body = {};
      try {
        body = await res.json();
      } catch (parseError) {
        body = {};
      }
      if (!res.ok) {
        var message = messageFromBody(body);
        return {
          ok: false,
          kind: "error",
          status: res.status,
          fields: fieldsForMessage(message),
          message: message
        };
      }
      return { ok: true, kind: "ok", welcomeUrl: WELCOME_URL };
    } catch (networkError) {
      return { ok: false, kind: "network", fields: [], message: NETWORK_MESSAGE };
    }
  }

  var api = {
    SIGNUP_ENDPOINT: SIGNUP_ENDPOINT,
    WELCOME_URL: WELCOME_URL,
    NETWORK_MESSAGE: NETWORK_MESSAGE,
    validateSignup: validateSignup,
    fieldsForMessage: fieldsForMessage,
    submitSignup: submitSignup
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CompdawgSignup = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
