# Jekyll Modernization — Stage 1: Tooling Refactor

**Date:** 2026-06-15
**Status:** Approved (design); pending spec review
**Scope:** Stage 1 of a staged modernization. This stage is a pure tooling/dependency
refactor: the site must render visually equivalent to the current production site, with
all dependencies brought up to date and dead tooling removed. The content model is
**unchanged** — the homepage remains posts-driven.

## Context

`elliotthauser.com` is a personal academic site built with Jekyll and deployed via GitHub
Pages. The current stack is circa 2014 and "long in the tooth":

- Jekyll **3.9.2**, pinned by the `github-pages` gem (v227), auto-built by GitHub Pages.
- CSS via Jekyll-native Sass: `css/app.scss` (YAML front-matter) imports
  `_sass/_settings.scss` (a 1,441-line Foundation 5 settings file) and Foundation from
  `bower_components/` → `css/app.css`.
- **Foundation 5** (2014) powers only the top-bar nav, the `dl/dd` homepage accordion, and
  a few grid `row`/`columns` wrappers. It pulls in **jQuery, Modernizr, fastclick** — all
  via **Bower** (an abandoned tool).
- **Font Awesome 4.2.0** via the old maxcdn/bootstrapcdn CDN.
- **Google Analytics** via legacy `analytics.js`/`ga()` — Universal Analytics, which Google
  shut off in July 2023, so tracking is already dead.
- Homepage `index.html` builds the accordion by looping `site.posts`, excluding
  `site.special-layouts` (tools) and hard-coded years 2011/2012.

Dead cruft present in the repo: `Gruntfile.js` (points at a `scss/` dir that doesn't exist,
outputs a `style.css` nothing links), `config.rb` (Compass), an empty `package.json`, a
`elliotthauser.wordpress.2013-07-29.xml` export, and an unreferenced `_data/resources.csvx`.

This stage is the first of three (later stages are out of scope here): (2) replace the
posts-driven homepage with a `_data/`-driven model; (3) feed a publications page from
Bib(la)tex in a separate LaTeX CV project. Stage-1 choices should not preclude stages 2–3
but must not implement them.

## Decisions

| Decision | Choice |
|---|---|
| Build pipeline | GitHub Actions + Jekyll 4.x |
| CSS/JS layer | Drop Foundation → minimal hand-written CSS + vanilla-JS accordion; remove jQuery/Modernizr/fastclick/Bower |
| Analytics | Remove entirely |
| Icons | Inline SVG (vendored, only glyphs in use) |
| Stage-1 scope | Keep homepage posts-driven; reimplement accordion only |
| Visual baseline | The live production site (elliotthauser.com) |

## Design

### 1. Build pipeline → Jekyll 4 + GitHub Actions

- **Gemfile:** remove `github-pages`; add `gem "jekyll", "~> 4.3"`. Jekyll 4 bundles
  `jekyll-sass-converter`, which depends on `sass-embedded` (already in the current
  Gemfile) — the existing `sass-embedded` line can stay as-is or be dropped to come in
  transitively; either is fine. No `plugins:` are configured today and there is no
  `_plugins/` dir, so no plugin gems are required. Rouge (highlighter) is built into
  Jekyll 4.
- **`.ruby-version`:** pin to Ruby 3.3.x for local/CI parity.
- **`.github/workflows/pages.yml`:** trigger on push to `master`. Steps:
  `actions/checkout` → `ruby/setup-ruby` (with `bundler-cache: true`) →
  `actions/configure-pages` → `bundle exec jekyll build` (with
  `JEKYLL_ENV=production`) → `actions/upload-pages-artifact` (path `_site`) →
  `actions/deploy-pages`. Standard two-job (build/deploy) Pages workflow with the
  required `pages: write` / `id-token: write` permissions.
- **Manual step (cannot be automated):** in repo Settings → Pages, switch *Source* from
  "Deploy from a branch" to "GitHub Actions." The implementation plan must call this out
  as an explicit human action; the site will not deploy correctly until it is done.
- **`CNAME`** stays in the repo root; Jekyll copies it into `_site`, preserving the custom
  domain.

### 2. CSS/JS → drop Foundation, go minimal

- **Delete** `bower_components/`, `bower.json`, `.bowerrc`.
- **`css/app.scss`** keeps its front-matter (so Jekyll's Sass converter compiles it to
  `css/app.css`, which `_layouts/default.html` links). Stop importing Foundation. New
  hand-written SCSS covers only what the site uses:
  - base/reset and typography (preserve current font stack + colors)
  - the fixed top-bar nav via flexbox, including the existing `max-width: 520px`
    breakpoint behavior
  - the accordion styles (preserving the existing custom accordion-icon rules already in
    `app.scss`)
  - a centered, max-width content container replacing Foundation's `row` / `small-12
    columns small-centered` grid wrappers used in `index.html` and the layouts
- **`_sass/_settings.scss`:** replace the 1,441-line Foundation settings file with a small
  (~20-line) partial holding only the variables actually referenced (colors, font stack,
  breakpoint). 
- **`js/app.js`:** replace the single `$(document).foundation();` line with a small
  vanilla-JS accordion controller. Behavior to preserve from the current Foundation config
  (`multi_expand: true, toggleable: true`): clicking a panel header toggles that panel's
  `active`/visible state independently of others; the Welcome panel is open on load (it
  currently carries `class="content active"`).
- **`_includes/scripts.html`:** reduce to a single `<script src="/js/app.js">` (no jQuery,
  no Foundation).
- Remove the Modernizr `<script>` tag from `_layouts/default.html`.

### 3. Analytics → removed

- Delete the Universal Analytics `<script>` block in `_layouts/default.html`.
- Strip the two `onclick="ga('send', 'event', ...)"` attributes in `index.html` (the
  "Expand Post" link and the "Follow Link" external link), leaving the links themselves
  intact.

### 4. Icons → inline SVG

- Add `_includes/icon.html` taking a `name` parameter and emitting a small inline `<svg>`.
- Vendor only the glyphs in use: `info-circle`, `angle-right`, `angle-down`, `comments`
  (Let's connect), `university` (Academia.edu), `mortar-board` (Google Scholar), `github`,
  `linkedin`.
- Remove the Font Awesome 4 CDN `<link>` from `_layouts/default.html`.
- Replace each `<i class="fa fa-...">` in `_layouts/default.html` and `index.html` with
  `{% include icon.html name="..." %}`.

### 5. Dead-file cleanup

Delete and remove from version control:

- `Gruntfile.js` (dead build path)
- `config.rb` (Compass, dead)
- `package.json` (empty)
- `elliotthauser.wordpress.2013-07-29.xml` (old WordPress export)
- `_data/resources.csvx` (confirmed unreferenced; grep hits were unrelated prose)

Update `CLAUDE.md` to document the corrected build/serve commands (Jekyll 4 via Bundler,
GitHub Actions deploy) and the corrected architecture (Jekyll-native Sass, no Grunt, no
Foundation/Bower). Review `.gitignore` for now-irrelevant entries (e.g. `node_modules`,
`.sass-cache`).

## Execution & Verification

- **Sequencing** — one branch, reviewable commits in this order, each building cleanly:
  1. Gemfile + `.ruby-version` + Actions workflow → confirm Jekyll 4 builds.
  2. Drop Foundation/Bower; rewrite `css/app.scss`, `_sass/_settings.scss`, `js/app.js`,
     `scripts.html`; add inline-SVG icons → the visual-equivalence work.
  3. Remove analytics.
  4. Delete dead files; update `CLAUDE.md` / `.gitignore`.
- **Visual baseline** — the live production site (elliotthauser.com). Capture headless
  screenshots of each page (home, research, teaching, advising, tools, a representative
  post) **before** changes; after the refactor builds locally under Jekyll 4, capture the
  same set and eyeball-diff for equivalence. (Local-building the *current* repo is avoided
  because it requires the old `github-pages` gem + matching Ruby.)
- **Build/asset checks** — `bundle exec jekyll build` completes with no errors/warnings;
  the built `_site` contains no references to deleted `bower_components`, Foundation,
  jQuery, Modernizr, Font Awesome CDN, or the `ga()` snippet; no broken asset links.
- **No unit-test surface** — this is a static site with no test suite; verification is
  build success + visual equivalence + the asset checks above.

## Out of Scope

- Stage 2: moving homepage news/link items from `_posts/` into a `_data/` model.
- Stage 3: Bib(la)tex-fed publications page and CV/site/paper unification.
- Any content edits, redesign, or visual changes beyond what's needed to render
  equivalently without Foundation.
