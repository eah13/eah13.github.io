# Stage 2: Data-Driven Homepage — Design

**Status:** Approved design, pre-implementation
**Date:** 2026-06-15
**Predecessor:** Stage 1 (dependency modernization, PR #26, merged & deployed)
**Successor:** Stage 3 (BibTeX-fed publications) — out of scope here

## Goal

Move the site's structured "recent activity" content out of ~17 individual `_posts/`
files into two YAML data files, rendered through the existing homepage accordion with
**no visible change** to the site. This establishes the data architecture that Stage 3's
BibTeX pipeline will later populate.

## Scope

**In scope:** the recent (2020+) posts, which split into two streams:

- **Papers** (`paper: true`, 10 files) → `_data/papers.yml`
- **Highlights** (2 talks + 5 news, 7 files) → `_data/highlights.yml`

**Explicitly out of scope (untouched):**

- The ~40 narrative essays (2011–2019) in `_posts/2010s/` — remain Jekyll posts.
- The ~30 `_posts/tools/` entries — legacy, kept only to avoid 404s; may be deleted
  separately later.
- Stage 3's BibTeX generation — `papers.yml` is *designed as its target* but is
  hand-authored in this stage.

## Data model

Both files use one shared entry schema, so one renderer serves both:

| Field   | Required | Notes |
|---------|----------|-------|
| `title` | yes      | Entry title. |
| `link`  | no       | External URL (DOI, video, news page). |
| `date`  | yes      | Publish date (`YYYY-MM-DD`, unquoted → YAML `Date`). Drives sort + the "First published on" line. Was previously derived from the post filename. |
| `type`  | papers: no / highlights: yes | Drives the link label. Omitted in `papers.yml` (implicitly `paper`). Present in `highlights.yml` (`video`, `news`). |
| `blurb` | see below | Markdown body (block scalar `\|`). Elliott's take on the item, often with an abstract excerpt and a collaborators line. |

### `_data/papers.yml` — comprehensive publications list

- `type` is **omitted**; the renderer treats a missing type as `paper`. (Future entries
  may set `type` if other publication kinds need different handling.)
- A paper renders on the homepage **only if it has a non-empty `blurb`**. This lets the
  file grow into a comprehensive list (Stage 3) while only blurbed papers are highlighted
  on the index.
- For Stage 2, all 10 migrated papers carry their existing body text as `blurb`, so all 10
  render — preserving the current homepage.

```yaml
- title: "Shaping Perceptions of Robots With Video Vantages"
  link: https://doi.org/10.5555/3721488.3721659
  date: 2025-02-04
  blurb: |
    *This study investigates the role of video vantage, "Encounterer" and "Observer"…*

    *With collaborators [Yao-Cheng Chan](https://yaochengchan.com/) and
    [Sadanand Modak](https://scholar.google.com/citations?user=yEPOWSYAAAAJ&hl=en)*
```

### `_data/highlights.yml` — curated non-paper items

- `type` is **explicit** (`video` for the two talks, `news` for the other five).
- Every highlight renders on the homepage (placing it here = choosing to show it). All
  seven carry their existing body text as `blurb`.

```yaml
- title: "What's that Robot Doing Here?"
  link: https://vimeo.com/856405441
  date: 2023-07-11
  type: video
  blurb: |
    *I presented collaborative research on a laboratory of quadruped robot encounters at
    the 1st annual Trustworthy Autonomous Systems (TAS) Symposium…*
```

### Link-label rule (unchanged from current behavior)

- `type == video` → "Watch the video"
- `type == paper` (incl. omitted) → "Read the paper"
- otherwise (e.g. `news`) → "Read more on *<domain-of-link>*"

This reproduces `index.html`'s existing `video`/`paper`/else logic. The five `news`
entries currently have no flag, so they get the "Read more on *domain*" label today and
keep it.

## Homepage rendering

The homepage accordion is assembled from three sources, in this visual order:

1. **Data block** — `papers.yml` entries *with a blurb* `concat`-ed with all
   `highlights.yml` entries, then `sort: "date" | reverse`.
2. **Essay block** — `site.posts` minus tools (`special-layouts`), in Jekyll's default
   reverse-chronological order, preserving exactly the current `index.html` filters: hide
   `published == false`, and hide the 2011 and 2012 years.

The Welcome panel stays first and unchanged.

### Why two blocks instead of one merged sort

A single merged-and-sorted list would have to compare a post's `date` (Ruby `Time`)
against a YAML `date` (Ruby `Date`); Liquid's `sort` raises on that mixed comparison, and
there is no way in pure Liquid to attach a uniform sort key to existing post objects.

The two-block render is correct because of a real invariant in the data: **every migrated
data item is dated 2020+ and every remaining essay is ≤2019**, so the two streams never
interleave — the data block is always strictly newer than the essay block. The papers and
highlights *within* the data block are both YAML `Date`s, so they sort together cleanly.

This invariant will be stated in a template comment. If a future essay is ever dated after
the oldest data item, the ordering at that boundary would need revisiting (a known,
documented limitation, not a silent bug).

### Shared partial

Extract `_includes/feed-entry.html` taking `title`, `date`, `body` (markdown), `link`,
`type`, and `index` (for the `#panel{{ index }}` anchor). Both the data loop and the essay
loop call it, removing the current duplicated accordion markup. The essay loop passes
`post.content` as `body` and `post.link`/`post.video`/`post.paper`-derived `type`; the data
loop passes `blurb` and the entry's `type`.

## Migration & cleanup

1. Author `_data/papers.yml` (10 entries) and `_data/highlights.yml` (7 entries) from the
   front matter + bodies of the source posts.
2. **Delete** the 17 migrated post files from `_posts/`.
3. Update `index.html` to render the two blocks via the shared partial.
4. Leave essays and `_posts/tools/` untouched.

### Source file → target mapping

`papers.yml` (10): `2023-10-31-understandingHRE`, `2024-01-03-facta`,
`2024-01-04-influencing-encounters`, `2024-04-09-participatory-observation-methods`,
`2024-09-16-nurse-perspectives`, `2024-10-30-vid2real`, `2024-11-24-accomplishing-autonomy`,
`2024-12-15-etiology`, `2025-02-04-vantages`, `2025-02-28-facts`.

`highlights.yml` (7): `2022-04-08-LWR-GS` (video), `2023-07-11-tas` (video),
`2020-05-07-ischool-welcome` (news), `2021-11-11-interview` (news), `2022-02-28-4s-cfp`
(news), `2022-03-07-lsi-hri` (news), `2022-04-01-sociotech-postdoc` (news).

## Verification

There is no test suite (it's a Jekyll site), so the regression check is a
**golden-output diff** of the rendered homepage:

1. On current `master`, build and extract the accordion's entry signatures from
   `_site/index.html` — for each panel: title, the "First published on" date, the link
   href, the link label, and the body text.
2. After the refactor, build again and extract the same signatures.
3. Confirm the set and order of entries match. Any difference must be explained
   (expected: none — the site looks identical).

A clean production build (`JEKYLL_ENV=production bundle exec jekyll build`) with no new
warnings is also required.

## Out-of-scope notes for later stages

- Stage 3 will generate/extend `papers.yml` from BibTeX in the LaTeX CV project. The schema
  here (title/link/date/blurb, type optional) is chosen to map cleanly onto BibTeX fields.
- A dedicated publications *page* (rendering all of `papers.yml`, blurbed or not) is a
  natural Stage 3 follow-on but is not built here.
