# Jekyll Modernization (Stage 1 — Tooling Refactor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the build tooling and front-end dependencies of elliotthauser.com so the site renders visually equivalent to the live production site, with Jekyll 4 + GitHub Actions replacing the github-pages gem, and Foundation/Bower/jQuery/Modernizr/Font Awesome/Universal-Analytics all removed.

**Architecture:** GitHub Actions builds the site with Jekyll 4 and deploys to Pages. Foundation 5 is replaced by ~150 lines of hand-written SCSS (base typography, a grid shim that preserves the existing `row`/`columns`/`*-centered` class names, the top-bar nav, and the accordion). The homepage and tools accordions are driven by ~20 lines of vanilla JS instead of Foundation+jQuery. Icons become inline SVG includes. Content model is unchanged — both accordions still loop `site.posts`.

**Tech Stack:** Jekyll 4.3, Ruby 3.3, jekyll-sass-converter (sass-embedded), GitHub Actions, vanilla JS/CSS.

**Visual baseline:** the live production site at https://elliotthauser.com — capture screenshots before refining CSS, compare after.

**Verification model:** there is no unit-test suite for a static site. "Tests" in this plan are (a) `bundle exec jekyll build` completing with no errors, (b) `grep` assertions that removed dependencies leave no references in `_site/`, and (c) visual comparison against the baseline. Each task ends with a concrete check and a commit.

---

## File Structure

**Created:**
- `.ruby-version` — pins Ruby 3.3 for local/CI parity
- `.github/workflows/pages.yml` — build + deploy workflow
- `_includes/icon.html` — inline-SVG icon partial (switch on `name`)

**Modified:**
- `Gemfile` — drop `github-pages`, add `jekyll ~> 4.3`
- `css/app.scss` — remove Foundation import; hand-written styles
- `_sass/_settings.scss` — replace 1,441-line Foundation settings with ~25 lines of site variables
- `js/app.js` — vanilla-JS accordion (replaces `$(document).foundation()`)
- `_includes/scripts.html` — load only `js/app.js`
- `_layouts/default.html` — remove Modernizr, FA CDN, GA snippet; swap `<i>` icons for includes
- `index.html` — swap `<i>` icons for includes; remove `ga()` onclick attributes
- `tools.html` — swap `<i>` icons for includes; remove `ga()` onclick attribute
- `CLAUDE.md` — correct build/serve/architecture docs
- `.gitignore` — drop node/sass-cache cruft

**Deleted:**
- `Gruntfile.js`, `config.rb`, `package.json`, `bower.json`, `.bowerrc`, `bower_components/`, `elliotthauser.wordpress.2013-07-29.xml`, `_data/resources.csvx`

---

## Task 1: Migrate build to Jekyll 4 + GitHub Actions

**Files:**
- Modify: `Gemfile`
- Create: `.ruby-version`
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: Pin the Ruby version**

Create `.ruby-version`:

```
3.3.5
```

- [ ] **Step 2: Replace the Gemfile**

Overwrite `Gemfile` with:

```ruby
source "https://rubygems.org"

gem "jekyll", "~> 4.3"

# Jekyll 4 bundles jekyll-sass-converter, which depends on sass-embedded.
# Listed explicitly to pin the SCSS toolchain.
gem "sass-embedded", "~> 1.0"

# Windows / JRuby timezone data (harmless elsewhere)
gem "tzinfo-data", platforms: [:mingw, :mswin, :x64_mingw, :jruby]
```

- [ ] **Step 3: Regenerate the lockfile and confirm Jekyll 4 resolves**

Run:

```bash
rm -f Gemfile.lock
bundle install
bundle exec jekyll --version
```

Expected: `bundle install` succeeds; version prints `jekyll 4.3.x`.

- [ ] **Step 4: Confirm the site still builds under Jekyll 4**

Run:

```bash
bundle exec jekyll build
```

Expected: build completes, "done in N seconds", no errors. (Sass deprecation *warnings* about Foundation are expected here — they go away in Task 4.)

- [ ] **Step 5: Create the Pages deploy workflow**

Create `.github/workflows/pages.yml`:

```yaml
name: Build and deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

# Allow one concurrent deployment, cancel in-progress runs of this workflow
concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.3"
          bundler-cache: true
      - name: Configure Pages
        id: pages
        uses: actions/configure-pages@v5
      - name: Build with Jekyll
        run: bundle exec jekyll build --baseurl "${{ steps.pages.outputs.base_path }}"
        env:
          JEKYLL_ENV: production
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./_site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 6: Validate the workflow YAML parses**

Run:

```bash
ruby -ryaml -e "YAML.load_file('.github/workflows/pages.yml'); puts 'YAML OK'"
```

Expected: `YAML OK`.

- [ ] **Step 7: Commit**

```bash
git add Gemfile Gemfile.lock .ruby-version .github/workflows/pages.yml
git commit -m "build: migrate to Jekyll 4 + GitHub Actions Pages workflow"
```

> **MANUAL STEP (Elliott, after this branch merges):** In GitHub repo **Settings → Pages**, set *Source* to **GitHub Actions**. Until this is done the workflow builds but the site keeps deploying from the old branch-based path. This cannot be automated.

---

## Task 2: Capture the visual baseline

**Files:** none (produces reference screenshots outside the repo).

This task records what "looks the same" means *before* touching styles, so later tasks can diff against it. Screenshots are saved to `/tmp/baseline/` (not committed).

- [ ] **Step 1: Capture the live site's key pages**

Use whatever headless browser is available. Preferred (Chromium):

```bash
mkdir -p /tmp/baseline
for page in "" research advising teaching tools; do
  name=${page:-home}
  chromium --headless --no-sandbox --hide-scrollbars \
    --window-size=1280,2000 \
    --screenshot="/tmp/baseline/$name.png" \
    "https://elliotthauser.com/$page"
done
ls -la /tmp/baseline/
```

If `chromium` is unavailable, use `google-chrome`, or the browser MCP/`verify` skill to screenshot each URL, or — as a last resort — Elliott opens each page and eyeballs it during the Task 8 comparison.

Expected: five PNGs in `/tmp/baseline/` (home, research, advising, teaching, tools).

- [ ] **Step 2: Capture a representative post page too**

```bash
chromium --headless --no-sandbox --hide-scrollbars --window-size=1280,2000 \
  --screenshot="/tmp/baseline/post.png" \
  "https://elliotthauser.com/2024/10/30/vid2real"
ls -la /tmp/baseline/post.png
```

Expected: `post.png` exists. (If that URL 404s, pick any post link from the live homepage accordion.)

No commit — baseline artifacts are throwaway.

---

## Task 3: Replace the Sass (remove Foundation)

**Files:**
- Modify: `_sass/_settings.scss`
- Modify: `css/app.scss`

This is the visual-equivalence core. The replacement CSS is a faithful first pass based on Foundation 5's defaults for the components actually used; Step 5 refines it against the Task 2 baseline.

- [ ] **Step 1: Replace the settings partial with site variables**

Overwrite `_sass/_settings.scss` with:

```scss
// Minimal site variables (replaces the Foundation 5 settings file)
$body-bg:            #fff;
$body-font-color:    #222;
$body-font-family:   "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif;
$anchor-color:       #008cba;   // Foundation 5 default link color
$anchor-color-hover: #0078a0;

$topbar-bg:          #333;
$topbar-link-color:  #fff;
$topbar-link-hover:  #272727;
$topbar-height:      45px;

$row-width:          62.5rem;   // 1000px, Foundation default container
$column-gutter:      1.875rem;  // 30px
$medium-breakpoint:  40em;      // 640px
$nav-collapse:       520px;     // existing small-screen accordion rule
```

- [ ] **Step 2: Rewrite `css/app.scss` (keep the front-matter)**

Overwrite `css/app.scss` with the following. Note the leading `---` front-matter is required so Jekyll's Sass converter processes it.

```scss
---
---
@import "settings";

/* ---------- base ---------- */
* { box-sizing: border-box; }

html { font-size: 100%; }

body {
  margin: 0;
  background: $body-bg;
  color: $body-font-color;
  font-family: $body-font-family;
  font-weight: normal;
  font-size: 1rem;
  line-height: 1.5;
}

a {
  color: $anchor-color;
  text-decoration: none;
  line-height: inherit;
  &:hover, &:focus { color: $anchor-color-hover; }
}

img { max-width: 100%; height: auto; -ms-interpolation-mode: bicubic; }

p  { margin: 0 0 1.25rem; line-height: 1.6; }
ul, ol { margin: 0 0 1.25rem 1.25rem; line-height: 1.6; }

h1, h2, h3, h4, h5, h6 {
  font-family: inherit;
  font-weight: normal;
  color: $body-font-color;
  line-height: 1.4;
  margin: 0.2rem 0 0.5rem;
  text-rendering: optimizeLegibility;
}
h1 { font-size: 2.125rem; }
h2 { font-size: 1.6875rem; }
h3 { font-size: 1.375rem; }
h4 { font-size: 1.125rem; }
h5 { font-size: 1.125rem; }
h6 { font-size: 1rem; }
@media only screen and (min-width: $medium-breakpoint) {
  h1 { font-size: 2.75rem; }
  h2 { font-size: 2.3125rem; }
  h3 { font-size: 1.6875rem; }
  h4 { font-size: 1.4375rem; }
}

hr { border: none; border-top: 1px solid #ddd; margin: 1.25rem 0; height: 0; }

/* ---------- grid shim (preserves Foundation class names) ---------- */
.row {
  max-width: $row-width;
  margin: 0 auto;
  width: 100%;
  &::after { content: ""; display: table; clear: both; }
  // nested rows are full-width, no max
  .row { max-width: none; width: auto; margin: 0 -0.9375rem; } // half of $column-gutter
}
.columns {
  float: left;
  width: 100%;
  padding: 0 0.9375rem; // half of $column-gutter
}
.small-centered { float: none; margin: 0 auto; }
@media only screen and (min-width: $medium-breakpoint) {
  .medium-10 { width: 83.3333%; }
}

/* ---------- top-bar nav ---------- */
.fixed.contain-to-grid { width: 100%; left: 0; position: fixed; top: 0; z-index: 99; }

.top-bar {
  background: $topbar-bg;
  height: $topbar-height;
  line-height: $topbar-height;
  margin-bottom: 0;
  overflow: visible;

  ul { margin: 0; list-style: none; }

  .title-area { float: left; margin: 0; }
  .name {
    height: $topbar-height;
    margin: 0;
    h1 { font-size: 1.0625rem; line-height: $topbar-height; margin: 0; }
    h1 a { color: $topbar-link-color; font-weight: normal; display: block; padding: 0 0.9375rem; }
  }

  .toggle-topbar { display: none; } // single-row nav; no JS hamburger

  .top-bar-section {
    ul { display: inline; }
    ul.right { float: right; }
    li { display: inline-block; }
    li > a {
      display: block;
      color: $topbar-link-color;
      padding: 0 0.9375rem;
      line-height: $topbar-height;
      background: $topbar-bg;
      font-size: 0.8125rem;
      &:hover { background: $topbar-link-hover; color: $topbar-link-color; }
    }

    // "Let's connect" dropdown on hover/focus
    li.has-dropdown { position: relative; }
    li.has-dropdown > a::after {
      content: ""; display: inline-block; margin-left: 0.5em;
      border: 5px solid transparent; border-top-color: rgba(255,255,255,0.6);
      position: relative; top: 3px;
    }
    .dropdown {
      position: absolute; left: 0; top: $topbar-height;
      display: none; min-width: 200px; z-index: 99;
      background: $topbar-bg; padding: 0;
      li { display: block; }
      li > a { line-height: 2.8125rem; white-space: nowrap; }
    }
    li.has-dropdown:hover > .dropdown,
    li.has-dropdown:focus-within > .dropdown { display: block; }
  }
}

/* ---------- main column ---------- */
#maincol:not(.postlist) { padding-top: 2rem; }

/* ---------- accordion ---------- */
.accordion {
  margin: 0; list-style: none;

  .accordion-navigation { display: block; margin: 0; }
  .accordion-navigation > a {
    background: #efefef;
    color: #222;
    display: block;
    padding: 1rem;
    font-size: 1rem;
    border-bottom: 1px solid #fff;
    &:hover { background: #e3e3e3; }
  }

  .content { display: none; padding: 0.9375rem; }
  .content.active { display: block; }

  // icons are inline <svg class="icon ..."> (Task 4), not <i> tags
  .accordion-navigation > a .icon { margin-right: 0.5em; }
  .icon-angle-right { display: inline; }
  .icon-angle-down  { display: none; }
  .accordion-navigation > a.active .icon-angle-right { display: none; }
  .accordion-navigation > a.active .icon-angle-down  { display: inline; }
}

@media only screen and (max-width: $nav-collapse) {
  .accordion .accordion-navigation > a, .accordion dd > a { font-size: 1.4em; }
}

/* ---------- misc page-specific (carried over) ---------- */
span.vcent { vertical-align: middle; }
li a .icon { margin-right: 1em; }  // nav icons are inline <svg class="icon"> (Task 4)

.bio .row .row {
  padding-bottom: 1rem;
  .columns { display: inline-block; vertical-align: middle; }
}

.speaking div {
  p, ul { padding: 0 1.5em; }
  hr { margin-top: 8px; }
}

/* inline-SVG icon sizing */
.icon { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; }
```

> Note on the accordion icon classes: the current markup uses `fa fa-angle-right` / `fa fa-angle-down` and toggles visibility via the parent's `active` class. Task 4 replaces those `<i class="fa fa-angle-...">` tags with `<i class="icon-angle-right">`-wrapped SVG includes, and Task 5's JS toggles `active` on the panel content + the header link. The CSS above matches those names.

- [ ] **Step 3: Build and confirm no Foundation references remain in output**

Run:

```bash
bundle exec jekyll build
grep -rl "foundation" _site/css/ || echo "NO FOUNDATION IN CSS — OK"
test -f _site/css/app.css && echo "app.css built — OK"
```

Expected: `NO FOUNDATION IN CSS — OK` and `app.css built — OK`. Build emits no Sass errors.

- [ ] **Step 4: Serve locally for visual inspection**

Run:

```bash
bundle exec jekyll serve --host 0.0.0.0 --port 8080 --detach
```

Then screenshot the local pages for comparison:

```bash
mkdir -p /tmp/after
for page in "" research advising teaching tools; do
  name=${page:-home}
  chromium --headless --no-sandbox --hide-scrollbars --window-size=1280,2000 \
    --screenshot="/tmp/after/$name.png" "http://localhost:8080/$page"
done
```

- [ ] **Step 5: Compare to baseline and refine**

Open each `/tmp/after/<page>.png` next to the matching `/tmp/baseline/<page>.png` (use the Read tool on both, or the browser). Check, in priority order: nav bar (color #333, height, link spacing, dropdown), body typography (font, heading sizes, link color), content width/centering, accordion header styling and open/closed state.

For any divergence, adjust the specific variable or rule in `_sass/_settings.scss` / `css/app.scss` (e.g. tune `$topbar-height`, heading `font-size`, `$row-width`), rebuild, re-screenshot. Repeat until pages read as equivalent. Stop the detached server when done: `pkill -f "jekyll serve"`.

Expected: local pages visually match the baseline.

- [ ] **Step 6: Commit**

```bash
git add _sass/_settings.scss css/app.scss
git commit -m "style: replace Foundation with hand-written SCSS (grid shim, nav, accordion)"
```

---

## Task 4: Inline-SVG icons

**Files:**
- Create: `_includes/icon.html`
- Modify: `_layouts/default.html`
- Modify: `index.html`
- Modify: `tools.html`

- [ ] **Step 1: Create the icon include**

Create `_includes/icon.html`. It emits an inline SVG selected by `include.name`, with an optional extra class via `include.class`. (Brand paths from simple-icons; UI glyphs from Bootstrap Icons — both MIT-licensed. If any glyph reads wrong during Task 8, swap the `d=` path; the contract is just `name` → svg.)

```liquid
{% assign cls = "icon" %}{% if include.class %}{% assign cls = cls | append: " " | append: include.class %}{% endif %}
{% case include.name %}
{% when "info-circle" %}<svg class="{{ cls }}" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 .974-.252 1.222-.598l.088-.416c-.193.176-.477.246-.665.246-.266 0-.363-.187-.294-.521l.95-4.47zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>
{% when "angle-right" %}<svg class="{{ cls }} icon-angle-right" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>
{% when "angle-down" %}<svg class="{{ cls }} icon-angle-down" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>
{% when "comments" %}<svg class="{{ cls }}" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/></svg>
{% when "university" %}<svg class="{{ cls }}" viewBox="0 0 16 16" aria-hidden="true"><path d="M8.211 2.047a.5.5 0 0 0-.422 0l-7.5 3.5a.5.5 0 0 0 .025.917l7.5 3a.5.5 0 0 0 .372 0L14 7.14V13a1 1 0 0 0-1 1v2h3v-2a1 1 0 0 0-1-1V6.739l.677-.27a.5.5 0 0 0 .025-.917l-7.5-3.5Z"/><path d="M4.176 9.032a.5.5 0 0 0-.656.327l-.5 1.7a.5.5 0 0 0 .294.605l4.5 1.8a.5.5 0 0 0 .372 0l4.5-1.8a.5.5 0 0 0 .294-.605l-.5-1.7a.5.5 0 0 0-.656-.327L8 10.466 4.176 9.032Z"/></svg>
{% when "mortar-board" %}<svg class="{{ cls }}" viewBox="0 0 16 16" aria-hidden="true"><path d="M8.211 2.047a.5.5 0 0 0-.422 0l-7.5 3.5a.5.5 0 0 0 .025.917l7.5 3a.5.5 0 0 0 .372 0L14 7.14V13a1 1 0 0 0-1 1v2h3v-2a1 1 0 0 0-1-1V6.739l.677-.27a.5.5 0 0 0 .025-.917l-7.5-3.5Z"/><path d="M4.176 9.032a.5.5 0 0 0-.656.327l-.5 1.7a.5.5 0 0 0 .294.605l4.5 1.8a.5.5 0 0 0 .372 0l4.5-1.8a.5.5 0 0 0 .294-.605l-.5-1.7a.5.5 0 0 0-.656-.327L8 10.466 4.176 9.032Z"/></svg>
{% when "github" %}<svg class="{{ cls }}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
{% when "linkedin" %}<svg class="{{ cls }}" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
{% endcase %}
```

- [ ] **Step 2: Swap icons in `_layouts/default.html`**

In `_layouts/default.html`, replace each FontAwesome `<i>` with an include:

- `<i class="fa fa-comments-o"></i>Let's connect` → `{% include icon.html name="comments" %}Let's connect`
- `<i class="fa fa-university fa-large"></i>Academia.edu` → `{% include icon.html name="university" %}Academia.edu`
- `<i class="fa fa-mortar-board fa-large"></i>Google Scholar` → `{% include icon.html name="mortar-board" %}Google Scholar`
- `<i class="fa fa-github fa-large"></i>Github` → `{% include icon.html name="github" %}Github`
- `<i class="fa fa-linkedin fa-large"></i>LinkedIn` → `{% include icon.html name="linkedin" %}LinkedIn`

(The commented-out Twitter `<li>` stays commented — leave it.)

- [ ] **Step 3: Swap icons in `index.html`**

- Line ~10: `<i class="fa fa-info-circle"></i>Welcome` → `{% include icon.html name="info-circle" %}Welcome`
- Line ~31 (accordion header): `<i class="fa fa-angle-right"></i><i class="fa fa-angle-down"></i>{{ post.title }}` → `{% include icon.html name="angle-right" %}{% include icon.html name="angle-down" %}{{ post.title }}`

- [ ] **Step 4: Swap icons in `tools.html`**

- `<i class="fa fa-info-circle"></i>Recommended Foundertools` → `{% include icon.html name="info-circle" %}Recommended Foundertools`
- `<i class="fa fa-angle-right"></i><i class="fa fa-angle-down"></i>{{ post.title }}` → `{% include icon.html name="angle-right" %}{% include icon.html name="angle-down" %}{{ post.title }}`

- [ ] **Step 5: Build and confirm no FontAwesome `<i>` tags remain in output**

Run:

```bash
bundle exec jekyll build
grep -rn 'class="fa ' _site/ && echo "FOUND fa TAGS — FIX" || echo "NO fa TAGS — OK"
grep -rln "<svg" _site/index.html _site/tools.html && echo "SVGs present — OK"
```

Expected: `NO fa TAGS — OK` and `SVGs present — OK`.

- [ ] **Step 6: Commit**

```bash
git add _includes/icon.html _layouts/default.html index.html tools.html
git commit -m "feat: replace Font Awesome icons with inline SVG includes"
```

---

## Task 5: Vanilla-JS accordion (remove jQuery/Foundation/Modernizr)

**Files:**
- Modify: `js/app.js`
- Modify: `_includes/scripts.html`
- Modify: `_layouts/default.html`

The current accordion (Foundation, `multi_expand: true, toggleable: true`) lets panels open/close independently, with the Welcome panel open on load. The markup: each panel is `<dd class="accordion-navigation"><a href="#panelN">…</a><div id="panelN" class="content [active]">…</div></dd>`.

- [ ] **Step 1: Replace `js/app.js` with a vanilla accordion**

Overwrite `js/app.js`:

```js
// Accordion: toggle each panel independently (replaces Foundation multi_expand+toggleable).
document.addEventListener("DOMContentLoaded", function () {
  var headers = document.querySelectorAll(".accordion .accordion-navigation > a");
  headers.forEach(function (header) {
    // Reflect each panel's initial state onto its header (for the SVG arrow swap).
    var panel = header.parentElement.querySelector(".content");
    if (panel && panel.classList.contains("active")) {
      header.classList.add("active");
    }
    header.addEventListener("click", function (e) {
      e.preventDefault();
      if (!panel) return;
      panel.classList.toggle("active");
      header.classList.toggle("active");
    });
  });
});
```

- [ ] **Step 2: Reduce `_includes/scripts.html` to just app.js**

Overwrite `_includes/scripts.html`:

```html
<script src="/js/app.js"></script>
```

- [ ] **Step 3: Remove the Modernizr script tag from `_layouts/default.html`**

Delete this line:

```html
<script src="bower_components/modernizr/modernizr.js"></script>
```

- [ ] **Step 4: Build and confirm no jQuery/Foundation/Modernizr references in output**

Run:

```bash
bundle exec jekyll build
grep -rniE "jquery|foundation\.js|modernizr" _site/ && echo "FOUND legacy JS refs — FIX" || echo "NO legacy JS refs — OK"
```

Expected: `NO legacy JS refs — OK`.

- [ ] **Step 5: Verify accordion behavior in the browser**

Run `bundle exec jekyll serve --port 8080 --detach`, open `http://localhost:8080/`, and confirm: Welcome panel open on load; clicking a closed header opens it (down-arrow shows); clicking an open header closes it (right-arrow shows); multiple panels can be open at once. Repeat on `/tools`. Stop server: `pkill -f "jekyll serve"`.

Expected: behavior matches the live site.

- [ ] **Step 6: Commit**

```bash
git add js/app.js _includes/scripts.html _layouts/default.html
git commit -m "feat: vanilla-JS accordion; drop jQuery, Foundation JS, Modernizr"
```

---

## Task 6: Remove analytics

**Files:**
- Modify: `_layouts/default.html`
- Modify: `index.html`
- Modify: `tools.html`

- [ ] **Step 1: Delete the Universal Analytics block in `_layouts/default.html`**

Remove the entire `<!-- Analytics -->` comment and the `<script>…ga('create', 'UA-20109396-1'…)…</script>` block that follows it (the IIFE creating the `ga` object plus the `ga('create'/'require'/'send')` calls).

- [ ] **Step 2: Remove the FontAwesome CDN `<link>` in `_layouts/default.html`**

Delete:

```html
<!-- Fontawesome -->
<link href="//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css" rel="stylesheet">
```

(Icons are inline SVG as of Task 4, so this CDN is now unused.)

- [ ] **Step 3: Strip `ga()` onclick attributes in `index.html`**

- Expand-post link: change
  `<a href="#panel{{ forloop.index }}" onclick="ga('send', 'event', 'Reading', 'Expand Post', '{{ post.title | slugify }}')">`
  to `<a href="#panel{{ forloop.index }}">`
- Follow-link: change
  `<a href="{{post.link}}" onclick="ga('send', 'event', 'Reading', 'Follow Link', '{{ post.title | slugify }}')">{{ linktext }}</a>`
  to `<a href="{{post.link}}">{{ linktext }}</a>`

- [ ] **Step 4: Strip the `ga()` onclick attribute in `tools.html`**

Change
`<a href="#panel{{ forloop.index }}" onclick="ga('send', 'event', 'Reading', 'Expand Tool', '{{ post.title | slugify }}')">`
to `<a href="#panel{{ forloop.index }}">`

- [ ] **Step 5: Build and confirm no analytics references remain**

Run:

```bash
bundle exec jekyll build
grep -rniE "google-analytics|ga\('|UA-20109396|font-awesome" _site/ && echo "FOUND analytics/FA refs — FIX" || echo "NO analytics/FA refs — OK"
```

Expected: `NO analytics/FA refs — OK`.

- [ ] **Step 6: Commit**

```bash
git add _layouts/default.html index.html tools.html
git commit -m "chore: remove dead Universal Analytics and unused Font Awesome CDN"
```

---

## Task 7: Delete dead files and update docs

**Files:**
- Delete: `Gruntfile.js`, `config.rb`, `package.json`, `bower.json`, `.bowerrc`, `bower_components/`, `elliotthauser.wordpress.2013-07-29.xml`, `_data/resources.csvx`
- Modify: `.gitignore`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove the dead files from git and disk**

Run:

```bash
git rm -r Gruntfile.js config.rb package.json bower.json .bowerrc bower_components \
  elliotthauser.wordpress.2013-07-29.xml _data/resources.csvx
```

Expected: all paths removed. (If `_data/` is now empty, that's fine — Jekyll tolerates its absence.)

- [ ] **Step 2: Confirm the site still builds without them**

Run:

```bash
bundle exec jekyll build
```

Expected: build succeeds, no "file not found" / missing-include errors.

- [ ] **Step 3: Trim `.gitignore`**

Overwrite `.gitignore` with (note: `Gemfile.lock` stays **tracked** — it pins the CI build — so it is NOT listed here):

```
_site
.jekyll-cache
.jekyll-metadata
```

- [ ] **Step 4: Update `CLAUDE.md`**

Replace the `## Commands` and `## Architecture` sections so they describe the new reality. The Commands block becomes:

````markdown
## Commands

```bash
# Install Ruby dependencies (Jekyll 4)
bundle install

# Serve locally with live reload
bundle exec jekyll serve --host 0.0.0.0 --port 8080

# Production build (what CI runs)
JEKYLL_ENV=production bundle exec jekyll build
```

Deployment: pushing to `master` triggers `.github/workflows/pages.yml`, which builds with
Jekyll 4 and deploys to GitHub Pages. There is no test suite; build errors surface during
`jekyll build`/`serve`.
````

In `## Architecture`, replace the **Styling** paragraph with:

> **Styling** is hand-written SCSS in `css/app.scss` (compiled by Jekyll's built-in
> `jekyll-sass-converter` to `css/app.css`), with site variables in `_sass/_settings.scss`.
> There is no CSS framework, Bower, Grunt, or Compass. The accordion is driven by vanilla
> JS in `js/app.js`. Icons are inline SVG via `_includes/icon.html`.

Remove the obsolete line about Grunt compiling `scss/style.scss` and "Do not edit
`css/style.css`."

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove Grunt/Bower/Compass cruft; update CLAUDE.md for Jekyll 4"
```

---

## Task 8: Final full-site verification

**Files:** none (verification only).

- [ ] **Step 1: Clean production build**

Run:

```bash
rm -rf _site
JEKYLL_ENV=production bundle exec jekyll build
```

Expected: completes with no errors or warnings.

- [ ] **Step 2: Run all dependency-removal assertions together**

Run:

```bash
echo "--- legacy refs (expect none) ---"
grep -rniE "foundation|jquery|modernizr|bower_components|font-awesome|google-analytics|ga\('|UA-20109396" _site/ \
  && echo "!! LEGACY REFS FOUND — investigate" || echo "CLEAN — no legacy refs"
echo "--- CNAME preserved ---"
cat _site/CNAME
```

Expected: `CLEAN — no legacy refs`; `_site/CNAME` prints the custom domain.

- [ ] **Step 3: Full visual comparison against baseline**

Serve (`bundle exec jekyll serve --port 8080 --detach`), screenshot all pages to `/tmp/after/`, and compare each to `/tmp/baseline/` from Task 2 (home, research, advising, teaching, tools, post). Confirm nav, typography, layout width, and accordion all read as equivalent. Fix any remaining CSS divergence in `css/app.scss` and re-verify. Stop server: `pkill -f "jekyll serve"`.

Expected: all pages visually equivalent to the live baseline.

- [ ] **Step 4: Commit any final CSS tweaks**

```bash
git add -A
git commit -m "style: final visual-parity tweaks" || echo "nothing to commit"
```

- [ ] **Step 5: Push the branch**

```bash
git push -u origin $(git branch --show-current)
```

Then remind Elliott of the **manual Pages-source switch** from Task 1, and that the first deploy happens after merge to `master`.

---

## Notes for the implementer

- **Keep commits per task** — each task is independently reviewable and builds cleanly.
- **The CSS in Task 3 and the SVG paths in Task 4 are faithful first passes, not sacred.** The verification loops (Task 3 Step 5, Task 8 Step 3) are where they get tuned to match the live site. Adjusting a `font-size`, color, or `d=` path during those steps is expected, not a deviation.
- **Do not** introduce the `_data/`-driven homepage or any Bibtex/publications work — those are later stages and explicitly out of scope (see the design spec).
