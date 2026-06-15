# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal academic/professional portfolio site for Elliott Hauser (elliotthauser.com), built with Jekyll and deployed via GitHub Pages.

## Commands

```bash
# Install Ruby dependencies
bundle install

# Install Node/Grunt dependencies
npm install

# Serve locally (hot-reloads content changes)
bundle exec jekyll serve --host 0.0.0.0 --port 8080

# Compile Sass to css/style.css
grunt build

# Watch and recompile Sass on change
grunt watch
```

There is no test suite. Jekyll build errors surface during `jekyll serve`.

## Architecture

**Content** lives in Markdown files with YAML front matter. Posts go in `_posts/` (organized in year subdirectories). Static pages (`bio.md`, `research.md`, `teaching.md`, `advising.md`) sit at the root.

**Layouts** in `_layouts/` define page structure. The `default` layout wraps everything (nav, GA, scripts); `page` and `post` extend it for content pages; `tools` is a special layout for the tools listing.

**Includes** in `_includes/` are reusable partials: `welcome.md` (homepage intro), `scripts.html` (JS deps), `tool.md` (single tool entry template).

**Styling** uses Foundation CSS (via Bower in `bower_components/`) with custom Sass in `scss/`. Grunt compiles `scss/style.scss` → `css/style.css`. Sass settings/overrides are in `_sass/_settings.scss`. Do not edit `css/style.css` directly.

**Homepage logic** (`index.html`): posts are filtered to exclude `special-layouts` (tools) defined in `_config.yml`, and old posts (pre-2013) are hidden behind a toggle. Posts display in a Foundation accordion grouped by year.

**Post front matter** fields to know:
- `link:` — external URL the post points to
- `paper: true` / `video: true` — changes link label ("Read the paper" / "Watch the video")
- `layout: post|page|tools`
- `published: false` — hides a post

**Site-wide nav links** and social profiles are configured in `_config.yml` under `sections:` and the social URL keys.
