# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal academic/professional portfolio site for Elliott Hauser (elliotthauser.com), built with Jekyll and deployed via GitHub Pages.

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

## Architecture

**Content** lives in Markdown files with YAML front matter and in `_data/` YAML files. Narrative essay posts (≤2019) live in `_posts/` (organized in year subdirectories). Recent activity (2020+) lives in two data files: `_data/papers.yml` (comprehensive publications; an entry shows on the homepage only if it has a `blurb`) and `_data/highlights.yml` (talks and news). Static pages (`bio.md`, `research.md`, `teaching.md`, `advising.md`) sit at the root.

**Layouts** in `_layouts/` define page structure. The `default` layout wraps everything (nav, GA, scripts); `page` and `post` extend it for content pages; `tools` is a special layout for the tools listing.

**Includes** in `_includes/` are reusable partials: `welcome.md` (homepage intro), `scripts.html` (JS deps), `tool.md` (single tool entry template).

**Styling** is hand-written SCSS in `css/app.scss` (compiled by Jekyll's built-in `jekyll-sass-converter` to `css/app.css`), with site variables in `_sass/_settings.scss`. There is no CSS framework, Bower, Grunt, or Compass. The accordion is driven by vanilla JS in `js/app.js`. Icons are inline SVG via `_includes/icon.html`.

**Homepage logic** (`index.html`): a data block renders `_data/papers.yml` entries that have a `blurb`, concatenated with all `_data/highlights.yml` entries and sorted by date; below it, an essay block renders `_posts/` content (excluding `special-layouts`/tools and the hidden 2011–2012 years). Each entry is rendered by `_includes/feed-entry.html`. The two blocks rely on the invariant that all data items are 2020+ and all essays are ≤2019, so they don't interleave.

**Post front matter** fields to know:
- `link:` — external URL the post points to
- `paper: true` / `video: true` — changes link label ("Read the paper" / "Watch the video")
- `layout: post|page|tools`
- `published: false` — hides a post

**Site-wide nav links** and social profiles are configured in `_config.yml` under `sections:` and the social URL keys.
