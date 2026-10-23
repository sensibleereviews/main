#!/usr/bin/env python3
"""
make-contact-functional.py — wire the static export's inquiry forms to real email delivery.

Run AFTER scripts/build-static-site.py (this script patches the generated files in
scripts/static-export/site/ in place and is idempotent — safe to re-run).

What it does
------------
1. contact-us.html    : names the captured fields, marks chip groups as single-select,
                        tags the "Send inquiry" button and adds a honeypot field.
                        (The page has no <form> element — assets/site.js collects the
                        fields and POSTs them as JSON.)
2. submit-a-ticket.html: gives the real <form> a native action (works without JS),
                        names the fields, adds hidden FormSubmit config + honeypot
                        and a priority mirror input kept in sync by site.js.
3. assets/site.js     : full functional rewrite — chips, AJAX email submission
                        (FormSubmit AJAX endpoint), branded inline success/error
                        panels with a mailto fallback, accordion + copy-link +
                        smooth-scroll behaviours preserved from the placeholder build.
4. README.txt         : documents the one-time FormSubmit activation step.

Delivery target: sensibleereviews@gmail.com (via https://formsubmit.co — free,
no signup; first submission from the live domain triggers an activation email).
Change the recipient by replacing that address in assets/site.js and the
<form action> in submit-a-ticket.html.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "static-export" / "site"

RECIPIENT = "sensibleereviews@gmail.com"
ENDPOINT = f"https://formsubmit.co/ajax/{RECIPIENT}"      # AJAX/JSON submissions (site.js)
CLASSIC = f"https://formsubmit.co/{RECIPIENT}"             # native no-JS form POST fallback

HONEY_INPUT = (
    '<input type="text" name="_honey" data-honey="1" tabindex="-1" '
    'autocomplete="off" aria-hidden="true" '
    'style="position:absolute!important;left:-6000px!important;top:-6000px!important;'
    'height:0!important;width:0!important;opacity:0!important;pointer-events:none">'
)

changes: list[str] = []


def patch(path: Path, old: str, new: str, label: str, expect: int = 1) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return  # already applied (new always embeds old as substring)
    n = text.count(old)
    if n != expect:
        sys.exit(f"ERROR: anchor for '{label}' found {n}x (expected {expect}) in {path.name}")
    path.write_text(text.replace(old, new), encoding="utf-8")
    changes.append(f"{path.name}: {label}")


def ensure_site_js_linked(html_name: str) -> None:
    path = SITE / html_name
    text = path.read_text(encoding="utf-8")
    if "assets/site.js" in text:
        return
    if "</body>" not in text:
        sys.exit(f"ERROR: no </body> in {html_name}")
    text = text.replace("</body>", '<script src="assets/site.js" defer></script></body>')
    path.write_text(text, encoding="utf-8")
    changes.append(f"{html_name}: injected assets/site.js reference")


# --------------------------------------------------------------------------
# 1. contact-us.html (no <form> element — fields are collected by site.js)
# --------------------------------------------------------------------------
contact = SITE / "contact-us.html"
ensure_site_js_linked("contact-us.html")

patch(contact, 'placeholder="Anand Menon"',
      'name="name" data-inquiry="name" placeholder="Anand Menon"',
      "name field named")
patch(contact, 'placeholder="Spice Route Kitchen"',
      'name="business" data-inquiry="business" placeholder="Spice Route Kitchen"',
      "business field named")
patch(contact, 'placeholder="you@business.com"',
      'name="email" data-inquiry="email" required placeholder="you@business.com"',
      "email field named + required")
patch(contact, 'placeholder="+91 93547 60585"',
      'name="phone" data-inquiry="phone" placeholder="+91 93547 60585"',
      "phone field named")
patch(contact, 'placeholder="e.g. We run 3 outlets',
      'name="message" data-inquiry="message" placeholder="e.g. We run 3 outlets',
      "message textarea named")

# chip groups → single-select containers (anchor = first button of each group)
text = contact.read_text(encoding="utf-8")
for anchor, group in (('>1 location<', "Locations"), ('&lt; 50 reviews / month<', "Monthly review volume")):
    i = text.find(anchor)
    j = text.rfind('<div class="flex flex-wrap gap-1.5"', 0, i)
    if j == -1:
        sys.exit(f"ERROR: chip group container for {group} not found")
    if 'data-chip-group' not in text[j:i]:
        text = text[:j] + text[j:].replace(
            '<div class="flex flex-wrap gap-1.5"',
            f'<div class="flex flex-wrap gap-1.5" data-chip-group="{group}"', 1)
        changes.append(f"contact-us.html: chip group {group}")
contact.write_text(text, encoding="utf-8")

# tag the submit button + honeypot right before it
text = contact.read_text(encoding="utf-8")
if 'data-inquiry-submit' not in text:
    i = text.find('data-slot="button">Send inquiry')
    start = text.rfind('<button', 0, i)
    text = (text[:start] + HONEY_INPUT + text[start:i]
            + 'data-slot="button" data-inquiry-submit="1">Send inquiry' + text[i + len('data-slot="button">Send inquiry'):])
    changes.append("contact-us.html: submit button tagged + honeypot")
    contact.write_text(text, encoding="utf-8")

# --------------------------------------------------------------------------
# 2. submit-a-ticket.html (real <form> — native POST fallback + AJAX via site.js)
# --------------------------------------------------------------------------
ticket = SITE / "submit-a-ticket.html"
ensure_site_js_linked("submit-a-ticket.html")

HIDDEN = (
    f'<input type="hidden" name="_subject" value="Support ticket request - sensiblee.com website">'
    '<input type="hidden" name="_template" value="table">'
    '<input type="hidden" name="_captcha" value="false">'
    '<input type="hidden" name="Priority" value="Normal" data-priority-mirror="1">'
)

text = ticket.read_text(encoding="utf-8")
# v2: ONLY the contact page emails inquiries. The ticket form stays visually
# identical to the app but its submission is inert (site.js no-ops it).
if 'data-email-form' in text or 'action="https://formsubmit.co' in text:
    text, n = re.subn(r'<form class="rounded-3xl[^>]*>',
                      '<form class="rounded-3xl border border-neutral-200/70 bg-white p-6 '
                      'shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-8" novalidate data-static-inert="1">',
                      text, count=1)
    if n != 1:
        sys.exit("ERROR: ticket <form> tag not matched for revert")
    # drop the FormSubmit hidden config block (subject/template/captcha/priority mirror)
    text = re.sub(r'<input type="hidden" name="_subject"[^>]*>'
                  r'(?:<input type="hidden" name="[^"]*"[^>]*>)*', '', text, count=1)
    ticket.write_text(text, encoding="utf-8")
    changes.append("submit-a-ticket.html: reverted to inert app-style form")

patch(ticket, 'placeholder="Anand Menon"',
      'name="name" required placeholder="Anand Menon"', "ticket name field named")
patch(ticket, 'placeholder="you@yourbusiness.in"',
      'name="email" required placeholder="you@yourbusiness.in"', "ticket email field named")
patch(ticket, 'placeholder="Spice Route Kitchen"',
      'name="business" placeholder="Spice Route Kitchen"', "ticket business field named")
patch(ticket, 'placeholder="What you expected, what happened instead',
      'name="message" placeholder="What you expected, what happened instead',
      "ticket message textarea named")
patch(ticket, '<select ', '<select name="topic" ', "ticket topic select named")
patch(ticket, '<div class="mt-2 grid grid-cols-3 gap-2">',
      '<div class="mt-2 grid grid-cols-3 gap-2" data-chip-group="Priority">',
      "ticket priority chips grouped")

# --------------------------------------------------------------------------
# 3 + 4 executed at bottom of file (SITE_JS / README_FORMS defined above them)
# ==========================================================================
SITE_JS = r'''
// Sensiblee static export — interactive behaviours + email-enabled inquiry form.
//
// The Contact Us "Send inquiry" form delivers every submission as an email via
// FormSubmit (https://formsubmit.co) to the address below. The very first
// submission from a new domain triggers a one-time activation email to that
// inbox — click "Activate" once and delivery starts.
//
// All other forms (support ticket, sign in, sign up) are intentionally inert:
// they look and feel like the app, but submission is a silent no-op.
//
// To use your own backend instead, define window.SENSIBLEE_FORM_ENDPOINT before
// this file loads (it receives a JSON POST with the form fields) or edit
// DEFAULT_ENDPOINT here.
(function () {
  "use strict";

  var RECIPIENT = "sensibleereviews@gmail.com";
  var DEFAULT_ENDPOINT = "https://formsubmit.co/ajax/" + RECIPIENT;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function endpoint() {
    // runtime override: define window.SENSIBLEE_FORM_ENDPOINT before submitting
    return (typeof window.SENSIBLEE_FORM_ENDPOINT === "string" && window.SENSIBLEE_FORM_ENDPOINT) || DEFAULT_ENDPOINT;
  }

  /* ---------------- accordion ---------------- */
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest('[data-slot="accordion-trigger"]');
    if (trigger) {
      var item = trigger.closest('[data-slot="accordion-item"]') || trigger.parentElement;
      var content = item && item.querySelector('[data-slot="accordion-content"]');
      var open = trigger.getAttribute("data-state") === "open";
      trigger.setAttribute("data-state", open ? "closed" : "open");
      if (item) item.setAttribute("data-state", open ? "closed" : "open");
      if (content) {
        content.setAttribute("data-state", open ? "closed" : "open");
        if (open) content.setAttribute("hidden", "");
        else content.removeAttribute("hidden");
      }
    }
  });

  /* ---------------- chip groups (single-select) ---------------- */
  var SEL = { border: "#3f9163", bg: "#e3f5ea", fg: "#2e6b4a" };

  function setChip(btn, on) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.style.borderColor = on ? SEL.border : "";
    btn.style.backgroundColor = on ? SEL.bg : "";
    btn.style.color = on ? SEL.fg : "";
  }

  function chipLabel(btn) {
    var span = btn.querySelector("span");
    return ((span && span.textContent) || btn.textContent).trim();
  }

  function groupValue(group) {
    var on = group.querySelector('button[aria-pressed="true"]');
    return on ? chipLabel(on) : "";
  }

  function syncPriorityMirror() {
    var mirror = document.querySelector('input[data-priority-mirror]');
    if (!mirror) return;
    var form = mirror.closest("form");
    var group = form && form.querySelector("[data-chip-group]");
    mirror.value = (group && groupValue(group)) || "Normal";
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-chip-group] button");
    if (!btn) return;
    var group = btn.closest("[data-chip-group]");
    if (!group) return;
    var wasOn = btn.getAttribute("aria-pressed") === "true";
    Array.prototype.forEach.call(group.querySelectorAll("button"), function (b) { setChip(b, false); });
    if (!wasOn) setChip(btn, true);
    syncPriorityMirror();
  });

  /* ---------------- inline result panels ---------------- */
  function panel(kind, html) {
    var el = document.createElement("div");
    el.className = "form-result";
    el.style.cssText = "margin:12px 0 0;padding:12px 14px;border-radius:12px;font-size:12.5px;font-weight:600;line-height:1.55;" +
      (kind === "success"
        ? "background:#ecfdf3;border:1px solid #88d6a0;color:#1c5b38;"
        : "background:#fef2f2;border:1px solid #f0b9b0;color:#8a2f24;");
    el.innerHTML = html;
    return el;
  }

  function mailtoHtml(subject, body) {
    return '<a style="color:inherit;text-decoration:underline" href="mailto:' + RECIPIENT +
      "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body) +
      '">email us directly</a>';
  }

  function clearResult(container) {
    var old = container.querySelector(".form-result");
    if (old) old.remove();
  }

  function busy(btn, on) {
    if (on) {
      btn.setAttribute("data-busy-html", btn.innerHTML);
      btn.disabled = true;
      btn.textContent = "Sending...";
    } else {
      btn.disabled = false;
      var html = btn.getAttribute("data-busy-html");
      if (html != null) btn.innerHTML = html;
    }
  }

  function sendAjax(payload, done) {
    fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { throw new Error("Unexpected response"); });
    }).then(function (data) {
      var ok = data && String(data.success).toLowerCase() === "true";
      done(ok ? null : (data && data.message) || "Submission failed");
    }).catch(function () {
      done("Network error");
    });
  }

  /* ---------------- contact page ("Send inquiry") ---------------- */
  var inquiryBtn = document.querySelector("[data-inquiry-submit]");
  if (inquiryBtn) {
    inquiryBtn.addEventListener("click", function (e) {
      e.preventDefault();
      var card = inquiryBtn.parentElement;
      var val = function (name) {
        var el = document.querySelector('[data-inquiry="' + name + '"]');
        return el ? el.value.trim() : "";
      };
      var name = val("name"), email = val("email");
      clearResult(card);

      var missing = [];
      if (!name) missing.push("your name");
      if (!EMAIL_RE.test(email)) missing.push("a valid email");
      if (missing.length) {
        card.appendChild(panel("error", "Please add " + missing.join(" and ") + " so we can get back to you."));
        return;
      }

      var payload = {
        _subject: "New inquiry from the sensiblee website - " + name,
        _template: "table",
        _captcha: "false",
        "Name": name,
        "Business": val("business"),
        "Email": email,
        "Phone": val("phone"),
        "Message": val("message")
      };
      Array.prototype.forEach.call(document.querySelectorAll("[data-chip-group]"), function (group) {
        var v = groupValue(group);
        if (v) payload[group.getAttribute("data-chip-group")] = v;
      });

      var honey = document.querySelector("input[data-honey]");
      if (honey && honey.value) { renderSuccess(); return; } // bot trap — stay silent

      renderBusy(true);
      sendAjax(payload, function (err) {
        renderBusy(false);
        if (!err) renderSuccess();
        else renderError(err, payload);
      });

      function renderBusy(on) { busy(inquiryBtn, on); }
      function renderSuccess() {
        clearResult(card);
        card.appendChild(panel("success",
          "Thank you" + (name ? ", " + name.split(" ")[0] : "") + "! Your inquiry has been sent to " +
          RECIPIENT + " — we usually reply within one business day."));
        Array.prototype.forEach.call(document.querySelectorAll("[data-inquiry]"), function (el) { el.value = ""; });
        Array.prototype.forEach.call(document.querySelectorAll("[data-chip-group] button"), function (b) { setChip(b, false); });
      }
      function renderError(reason, p) {
        clearResult(card);
        card.appendChild(panel("error",
          "We couldn't send your message just now (" + reason + "). Please " +
          mailtoHtml(p._subject,
            "Name: " + p["Name"] + "\nBusiness: " + p["Business"] + "\nEmail: " + p["Email"] +
            "\nPhone: " + p["Phone"] + "\n\n" + p["Message"]) +
          " — we read every message."));
      }
    });
  }

  /* initial visual state: pre-selected chips (e.g. ticket priority "Normal") */
  var INIT_SELECTED = [];
  Array.prototype.forEach.call(document.querySelectorAll("[data-chip-group]"), function (group) {
    var on = group.querySelector('button[aria-pressed="true"]');
    if (on) { setChip(on, true); INIT_SELECTED.push([group, on]); }
  });
  syncPriorityMirror();

  /* ---------------- inert forms (ticket form + captured app screens) ----------------
     Only the Contact Us inquiry flow sends email in the static export. Every other
     form (support ticket, sign in, sign up) is kept pixel-identical to the app but
     its submission is a silent no-op, per the placeholder-build brief. */
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (form && form.matches && form.matches("form[data-email-form]")) return;
    e.preventDefault();
  }, true);

  /* ---------------- share: copy link ---------------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn || btn.textContent.trim().toLowerCase() !== "copy link") return;
    e.preventDefault();
    var t = btn.textContent;
    var done = function () {
      btn.textContent = "Link copied";
      setTimeout(function () { btn.textContent = t; }, 1600);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, done);
    else done();
  });

  /* ---------------- smooth in-page anchors ---------------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a) return;
    var url = new URL(a.href, location.href);
    if (url.pathname === location.pathname && url.hash) {
      var el = document.querySelector(url.hash);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
})();
'''

# ==========================================================================
README_FORMS = r'''
------------------------------------------------------------
FORMS - EMAIL DELIVERY (Contact Us page)
------------------------------------------------------------
The inquiry form on contact-us.html is functional: every
submission is emailed to

    sensibleereviews@gmail.com

through FormSubmit.co (a free form-to-email gateway for static
sites - no server, database or signup required).

ONE-TIME ACTIVATION (required, takes ~30 seconds):
  1. Upload this site and open your live Contact Us page.
  2. Fill in the form and send one test inquiry.
  3. FormSubmit emails a "Please activate your form" link to
     sensibleereviews@gmail.com - open it and click Activate.
  4. Submit the form once more; the email should now arrive.

WHAT EACH EMAIL CONTAINS: the visitor's name, business, email,
phone, the selected location / review-volume chips and their
message, in a clean table layout.

SPAM PROTECTION: a hidden honeypot field silently drops bots;
the FormSubmit captcha page is disabled for a smooth UX.

IF A SUBMISSION FAILS (offline, gateway hiccup): the visitor
sees an inline notice with a pre-filled "email us directly"
mailto: link to sensibleereviews@gmail.com.

ALL OTHER FORMS ARE INTENTIONALLY INERT (as requested): the
support-ticket form and the Sign in / Start your free trial
screens look exactly like the app, but submission is a silent
no-op - no data is sent anywhere.

CHANGING THE RECIPIENT: search-and-replace
"sensibleereviews@gmail.com" in assets/site.js.

USING YOUR OWN BACKEND INSTEAD: either edit the endpoint at the
top of assets/site.js, or set
window.SENSIBLEE_FORM_ENDPOINT = "https://your-api/endpoint"
before site.js loads. It receives a JSON POST with the fields.
'''


# ==========================================================================
# execution (kept below the SITE_JS / README_FORMS definitions)
# ==========================================================================
def main() -> None:
    site_js = SITE / "assets" / "site.js"
    site_js.write_text(SITE_JS, encoding="utf-8")
    changes.append("assets/site.js: functional email submission rewrite")

    readme = SITE / "README.txt"
    text = readme.read_text(encoding="utf-8")
    if "FORMS - EMAIL DELIVERY" not in text:
        text = text.rstrip("\n") + "\n\n" + README_FORMS.strip("\n") + "\n"
        readme.write_text(text, encoding="utf-8")
        changes.append("README.txt: email delivery section")

    print(f"Applied {len(changes)} changes:")
    for c in changes:
        print("  -", c)


if __name__ == "__main__":
    main()
