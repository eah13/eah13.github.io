# Data-Driven Homepage (Stage 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move ~17 recent (2020+) posts out of `_posts/` into two YAML data files rendered through the existing homepage accordion, with the rendered site looking identical.

**Architecture:** `_data/papers.yml` (comprehensive publications; blurb gates display) and `_data/highlights.yml` (curated non-paper items) feed a new shared `_includes/feed-entry.html` partial. `index.html` renders a data block (papers-with-blurb + highlights, sorted by date) above an essay block (remaining posts). The two blocks never interleave because every data item is 2020+ and every remaining essay is ≤2019.

**Tech Stack:** Jekyll 4, Liquid, YAML data files. Build via `bundle exec jekyll serve/build` (Ruby 3.3.5 through mise — in an interactive shell `bundle` just works; in a non-interactive shell prefix with `mise exec --`). No test framework; regression is a golden-output diff of the rendered `_site/index.html`.

**Reference:** Full design at `docs/superpowers/specs/2026-06-15-jekyll-data-architecture-design.md`.

**Branch:** Work happens on `data-driven-homepage` (already created; the design doc is committed there).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `_data/papers.yml` (create) | Comprehensive list of publications. One entry per paper: `title`, `link`, `date`, optional `blurb`. No `type` (implicitly paper). |
| `_data/highlights.yml` (create) | Curated non-paper homepage items (talks, news). `title`, `link`, `date`, `blurb`, optional `type` (`video` for talks; omitted for news). |
| `_includes/feed-entry.html` (create) | Renders ONE accordion entry (`<dd>…</dd>`). Single source of the entry markup, used by both the data loop and the essay loop. |
| `index.html` (modify) | Welcome panel (unchanged) + data block + essay block, each entry via the partial. |
| `_posts/` (delete 17 files) | The migrated posts are removed. |
| `CLAUDE.md` (modify) | Architecture notes updated to describe the data files. |

---

## Task 1: Capture the baseline golden output

This is the regression oracle. It must be captured from the current tree **before** any change. Tasks 2–4 don't alter the homepage output, but capture now to be safe.

**Files:** none changed (produces `/tmp/home-before.txt`).

- [ ] **Step 1: Build the site as it is now**

Run:
```bash
JEKYLL_ENV=production bundle exec jekyll build
```
Expected: build completes, exit code 0, `_site/index.html` exists.

- [ ] **Step 2: Extract a normalized signature of the homepage**

The only intended structural change is the panel-anchor id scheme (`panel1` → `panel-r1`/`panel-e1`). Normalize every panel id/href to a constant token so the diff focuses on titles, dates, links, labels, body text, and order:

```bash
sed -E 's/(id|href)="#?panel[-a-z0-9]*"/\1="PANEL"/g' _site/index.html > /tmp/home-before.txt
wc -l /tmp/home-before.txt
```
Expected: a non-empty file (the rendered homepage with normalized anchors).

- [ ] **Step 3: Record the entry count for a sanity check**

Run:
```bash
grep -c 'accordion-navigation' /tmp/home-before.txt
```
Expected: prints the number of accordion headers (Welcome + every shown post). Note this number; Task 6 confirms it is unchanged.

No commit (produces only a throwaway file in `/tmp`).

---

## Task 2: Create `_data/papers.yml`

**Files:**
- Create: `_data/papers.yml`

Each entry is built from a source post in `_posts/`. Field mapping:

- `title:` ← the post's front-matter `title` (double-quote the value).
- `link:` ← the post's front-matter `link` (unquoted).
- `date:` ← the date in the post's filename, as `YYYY-MM-DD` **unquoted** (parses to a YAML Date).
- **No `type:`** — papers are implicitly typed `paper`.
- `blurb: |` ← the post body **verbatim** (everything after the closing `---` of the front matter), indented two spaces under the `|` block scalar. Preserve markdown, links, italics, and blank lines exactly. Trim only a leading/trailing fully-blank line.

The 10 papers and their front-matter fields (bodies live in the named files):

| Source file (`_posts/…`) | title | link | date |
|---|---|---|---|
| `2023-10-31-understandingHRE.md` | Understanding Reactions in Human-Robot Encounters | https://asistdl.onlinelibrary.wiley.com/doi/full/10.1002/pra2.771 | 2023-10-31 |
| `2024-01-03-facta.md` | Making-to-be: Documents, Facta, and Material-Discursive Agency | https://ideaexchange.uakron.edu/docam/vol10/iss2/3/ | 2024-01-03 |
| `2024-01-04-influencing-encounters.md` | Influencing Incidental Human-Robot Encounters | https://hdl.handle.net/10125/106464 | 2024-01-04 |
| `2024-04-09-participatory-observation-methods.md` | Participatory Observation Methods Within Data-Intensive Science | https://doi.org/10.1007/978-3-031-57850-2_19 | 2024-04-09 |
| `2024-09-16-nurse-perspectives.md` | Nurses’ Perspectives of Care Robots for Assisted Living Facilities | https://doi.org/10.2196/58629 | 2024-09-16 |
| `2024-10-30-vid2real.md` | Vid2RealHRI: Align video-based HRI with the real-world | https://doi.org/10.1109/RO-MAN60168.2024.10731413 | 2024-10-30 |
| `2024-11-24-accomplishing-autonomy.md` | Accomplishing Robotic Autonomy: Sociotechnical Care and Agency in the Laboratory | https://doi.org/10.30658/hmc.9.9 | 2024-11-24 |
| `2024-12-15-etiology.md` | Toward an Etiology of Harm for Knowledge Organization | https://doi.org/10.5771/0943-7444-2024-7-495 | 2024-12-15 |
| `2025-02-04-vantages.md` | Shaping Perceptions of Robots With Video Vantages | https://doi.org/10.5555/3721488.3721659 | 2025-02-04 |
| `2025-02-28-facts.md` | Facts in the Machine | https://doi.org/10.1002/asi.24820 | 2025-02-28 |

- [ ] **Step 1: Write the file**

Order is irrelevant (the homepage sorts by date), but list newest-first for readability. Worked example for `2023-10-31-understandingHRE.md` (whose body has three italic paragraphs) — reproduce this shape for all 10, lifting each body verbatim:

```yaml
# Publications. Comprehensive list; an entry appears on the homepage only if it
# has a `blurb`. type is omitted (implicitly "paper"). Stage 3 will generate/extend
# this file from BibTeX.
- title: "Shaping Perceptions of Robots With Video Vantages"
  link: https://doi.org/10.5555/3721488.3721659
  date: 2025-02-04
  blurb: |
    *This study investigates the role of video vantage, "Encounterer" and "Observer", in shaping perceptions of robot social intelligence. Using videos depicting robots navigating hallways and employing gaze cues, results revealed that the Observer vantage consistently yielded higher ratings for perceived social intelligence compared to the Encounterer vantage. These findings underscore the impact of vantage on interpreting robot behaviors and highlight the need for careful design of video-based HRI studies to ensure accurate and generalizable insights for real-world applications.*

    *With collaborators [Yao-Cheng Chan](https://yaochengchan.com/) and [Sadanand Modak](https://scholar.google.com/citations?user=yEPOWSYAAAAJ&hl=en)*

# … 9 more entries, each body copied verbatim from its source post …
- title: "Understanding Reactions in Human-Robot Encounters"
  link: https://asistdl.onlinelibrary.wiley.com/doi/full/10.1002/pra2.771
  date: 2023-10-31
  blurb: |
    *This paper presents an emerging theory of factors influencing the experience of encountering an autonomous quadruped robot, based on analysis of interviews conducted in our lab at Texas Robotics.*

    *Collaborative work with my doctoral student [Yao-Cheng Chan](https://yaochengchan.com/), who was lead author and presented the paper at [ASIS&T 2023](https://www.asist.org/am23/) in London, England.*

    *This work was supported by NSF grant #2219236 and UT Austin's Good Systems initiative.*
```

- [ ] **Step 2: Validate the YAML parses**

Run:
```bash
ruby -ryaml -e 'd=YAML.load_file("_data/papers.yml"); puts d.size; d.each{|e| raise "missing field in #{e.inspect}" unless e["title"]&&e["link"]&&e["date"]&&e["blurb"]}'
```
Expected: prints `10` and exits 0 (no `missing field` error). The `date` values load as Ruby `Date` objects.

- [ ] **Step 3: Build to confirm Jekyll is happy**

Run:
```bash
JEKYLL_ENV=production bundle exec jekyll build
```
Expected: exit 0. (The homepage is unchanged — the data file isn't referenced yet.)

- [ ] **Step 4: Commit**

```bash
git add _data/papers.yml
git commit -m "Add _data/papers.yml (10 publications migrated from _posts)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 caveat — verbatim bodies

Do **not** paraphrase, reflow, or "clean up" any body text. The Task 6 golden diff compares the rendered output byte-for-byte (modulo whitespace); any edit to wording will surface as a regression. Copy each body exactly as it appears after the front matter in the source file.

---

## Task 3: Create `_data/highlights.yml`

**Files:**
- Create: `_data/highlights.yml`

Same field mapping as Task 2, with one difference: **`type:`**.
- The two talks set `type: video`.
- The five news items have **no `type:`** (they render with the default "Read more on *domain*" label, exactly as today).

The 7 highlights:

| Source file (`_posts/…`) | title | link | date | type |
|---|---|---|---|---|
| `2022-04-08-LWR-GS.md` | Living and Working With Robots Research Update | https://youtu.be/3Kz4CRIRw-0 | 2022-04-08 | video |
| `2023-07-11-tas.md` | What's that Robot Doing Here? | https://vimeo.com/856405441 | 2023-07-11 | video |
| `2020-05-07-ischool-welcome.md` | Joining the Faculty at UT Austin's iSchool | https://ischool.utexas.edu/news/ischool-welcomes-dr-elliott-hauser | 2020-05-07 | *(none)* |
| `2021-11-11-interview.md` | Interview: Bringing Robots into the Real World | https://medium.com/good-systems/bringing-robots-into-the-real-world-q-a-with-peter-stone-and-elliott-hauser-86c1c7ebaf04 | 2021-11-11 | *(none)* |
| `2022-02-28-4s-cfp.md` | CFP: Community-Robot Reconfigurations at 4S 2022 | https://www.4sonline.org/24-community-robot-reconfigurations-living-and-working-amidst-autonomy/ | 2022-02-28 | *(none)* |
| `2022-03-07-lsi-hri.md` | HRI 2022 Workshop: Longitudinal Social Impacts of HRI | https://sites.google.com/view/lsi-hri/home | 2022-03-07 | *(none)* |
| `2022-04-01-sociotech-postdoc.md` | Hiring a Postdoc in Sociotechnical Studies of Robotics | https://apply.interfolio.com/105047 | 2022-04-01 | *(none)* |

- [ ] **Step 1: Write the file**

Worked examples — one talk (with `type`) and one news item (no `type`), bodies copied verbatim from source:

```yaml
# Curated non-paper homepage items (talks, news). All are shown on the homepage.
# `type: video` gets the "Watch the video" label; entries with no type get the
# default "Read more on <domain>" label.
- title: "What's that Robot Doing Here?"
  link: https://vimeo.com/856405441
  date: 2023-07-11
  type: video
  blurb: |
    *I presented a collaborative research on a laboratory of quadruped robot encounters at the 1st annual [Trustworthy Autonomous Systems (TAS) Symposium](https://symposium.tas.ac.uk/) in Edinburgh, Scotland. The paper reports that identifying the robot's role and purpose are central concerns for participants and identifies methodological challenges of human-robot encounters research.*

- title: "Joining the Faculty at UT Austin's iSchool"
  link: https://ischool.utexas.edu/news/ischool-welcomes-dr-elliott-hauser
  date: 2020-05-07
  blurb: |
    *"The University of Texas at Austin School of Information is pleased to welcome Dr. Elliott Hauser, who will be joining us as an assistant professor in August 2020. He comes to the iSchool from the University of North Carolina at Chapel Hill, where he earned his Ph.D. in Information Science in December 2019."*

# … 5 more entries (the other talk + four remaining news items) …
```

- [ ] **Step 2: Validate the YAML parses**

Run:
```bash
ruby -ryaml -e 'd=YAML.load_file("_data/highlights.yml"); puts d.size; v=d.count{|e| e["type"]=="video"}; n=d.count{|e| e["type"].nil?}; puts "video=#{v} notype=#{n}"; d.each{|e| raise "missing field in #{e.inspect}" unless e["title"]&&e["link"]&&e["date"]&&e["blurb"]}'
```
Expected: prints `7` then `video=2 notype=5`, exits 0.

- [ ] **Step 3: Commit**

```bash
git add _data/highlights.yml
git commit -m "Add _data/highlights.yml (7 talks/news migrated from _posts)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Create the shared `_includes/feed-entry.html` partial

**Files:**
- Create: `_includes/feed-entry.html`

This renders one accordion entry. Parameters (passed via `include`):
- `title` — entry title (string)
- `date` — a Date (YAML) or Time (post); formatted with the `date` filter
- `body` — markdown string to render in the panel (`blurb` for data, `post.content` for posts)
- `link` — outbound URL (may be empty)
- `type` — `"video"`, `"paper"`, or empty/other (drives the link label)
- `panel_id` — id prefix (`"panel-r"` or `"panel-e"`)
- `anchor` — a number (the loop index) appended to `panel_id` for a unique id

The markup reproduces the current `index.html` per-entry markup exactly (same classes, same date line, same `markdownify`, same link-label logic). The id is cosmetic (the accordion JS uses DOM traversal, not the href), so the only behavioral requirement is that ids are unique and valid.

- [ ] **Step 1: Write the partial**

```liquid
{%- assign pid = include.panel_id | append: include.anchor -%}
<dd class="accordion-navigation">
<a href="#{{ pid }}">{% include icon.html name="angle-right" %}{% include icon.html name="angle-down" %}{{ include.title }}</a>
<div id="{{ pid }}" class="content">
  <div class="text-right post-date"><em>First published on {{ include.date | date: "  %B %e, %Y" }}</em></div>

  {{ include.body | markdownify }}

  {% if include.link %}
  <div>
    {% if include.type == "video" %}{% assign linktext = "Watch the video" %}
    {% elsif include.type == "paper" %}{% assign linktext = "Read the paper" %}
    {% else %}Read more on {% capture linktext %}{{ include.link | replace: 'https://', 'http://' | remove: 'http://' | split: '/' | first }}{% endcapture %}{% endif %}
    <a href="{{ include.link }}">{{ linktext }}</a>
  </div>
  {% endif %}
</div>
</dd>
```

- [ ] **Step 2: Build to confirm it parses**

Run:
```bash
JEKYLL_ENV=production bundle exec jekyll build
```
Expected: exit 0. (Partial is not yet referenced; homepage unchanged.)

- [ ] **Step 3: Commit**

```bash
git add _includes/feed-entry.html
git commit -m "Add _includes/feed-entry.html shared accordion-entry partial

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Rewrite `index.html` and delete the migrated posts

These happen **together in one commit**: until the posts are deleted, the essay loop would also render the 2020+ posts (duplicating the data block). Doing both at once keeps every committed state correct.

**Files:**
- Modify: `index.html` (replace the single post loop with a data block + essay block, both via the partial)
- Delete: the 17 migrated files in `_posts/`

- [ ] **Step 1: Replace `index.html` with the data-driven version**

Full new contents of `index.html`:

```liquid
---
layout: default
class: postlist
title: Welcome!
---
<div class="row">
  <div class="small-12 columns small-centered" id="home">
  <dl class="accordion" data-accordion>
    <dd class="accordion-navigation">
    <a id="welcomeheader" href="#welcome">{% include icon.html name="info-circle" %}Welcome</a>
      <div id="welcome" class="content active">
        {% capture welcometext %}{% include welcome.md %}{% endcapture %}
        {{ welcometext | markdownify }}
      </div>
    </dd>

    {%- comment -%}
      Recent activity (2020+) is data-driven. papers.yml is the comprehensive publications
      list; only entries WITH a blurb appear here. highlights.yml entries all appear. Both
      use YAML Dates, so they sort together cleanly.

      INVARIANT: every data item is dated 2020+ and every essay (post) below is <=2019, so
      the two blocks never interleave. If a future essay is ever dated after the oldest data
      item, the boundary ordering would need revisiting (see Stage 2 design doc). A merged
      cross-type sort is intentionally avoided: Liquid cannot compare a post's Time date
      against a YAML Date.
    {%- endcomment -%}
    {% assign blurbed_papers = site.data.papers | where_exp: "p", "p.blurb" %}
    {% assign recent = blurbed_papers | concat: site.data.highlights | sort: "date" | reverse %}
    {% for item in recent %}
      {% assign etype = item.type %}
      {% if etype == nil and site.data.papers contains item %}{% assign etype = "paper" %}{% endif %}
      {% include feed-entry.html title=item.title date=item.date body=item.blurb link=item.link type=etype panel_id="panel-r" anchor=forloop.index %}
    {% endfor %}

    {% comment %} Narrative essays (<=2019) remain Jekyll posts; tools and 2011/2012 hidden. {% endcomment %}
    {% for post in site.posts %}
      {% assign print = "true" %}
      {% for layout in site.special-layouts %}
        {% if post.layout contains layout %}
          {% assign print = false %}
        {% endif %}
      {% endfor %}
      {% capture this_year %}{{ post.date | date: "%Y" }}{% endcapture %}
      {% if this_year == "2012" or this_year == "2011" %}
        {% assign print = false %}
      {% endif %}
      {% if post.published == false %}{% assign print = false %}{% endif %}
      {% if print == "true" %}
        {% assign etype = "" %}
        {% if post.video %}{% assign etype = "video" %}{% elsif post.paper %}{% assign etype = "paper" %}{% endif %}
        {% include feed-entry.html title=post.title date=post.date body=post.content link=post.link type=etype panel_id="panel-e" anchor=forloop.index %}
      {% endif %}
    {% endfor %}

</dl>
</div>
</div>
```

- [ ] **Step 2: Delete the 17 migrated posts**

Run:
```bash
git rm \
  _posts/2023-10-31-understandingHRE.md \
  _posts/2024-01-03-facta.md \
  _posts/2024-01-04-influencing-encounters.md \
  _posts/2024-04-09-participatory-observation-methods.md \
  _posts/2024-09-16-nurse-perspectives.md \
  _posts/2024-10-30-vid2real.md \
  _posts/2024-11-24-accomplishing-autonomy.md \
  _posts/2024-12-15-etiology.md \
  _posts/2025-02-04-vantages.md \
  _posts/2025-02-28-facts.md \
  _posts/2022-04-08-LWR-GS.md \
  _posts/2023-07-11-tas.md \
  _posts/2020-05-07-ischool-welcome.md \
  _posts/2021-11-11-interview.md \
  _posts/2022-02-28-4s-cfp.md \
  _posts/2022-03-07-lsi-hri.md \
  _posts/2022-04-01-sociotech-postdoc.md
```
Expected: git stages 17 deletions. Confirm with:
```bash
git status --short | grep -c '^D'
```
Expected: `17`.

- [ ] **Step 3: Build**

Run:
```bash
JEKYLL_ENV=production bundle exec jekyll build
```
Expected: exit 0, no Liquid errors/warnings.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Render homepage recent activity from _data; delete migrated posts

index.html now renders a data block (papers-with-blurb + highlights,
date-sorted) above the essay posts, both via _includes/feed-entry.html.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Verify the site looks the same (golden diff)

**Files:** none changed (produces `/tmp/home-after.txt`).

- [ ] **Step 1: Build and extract the post-change signature**

Run:
```bash
JEKYLL_ENV=production bundle exec jekyll build
sed -E 's/(id|href)="#?panel[-a-z0-9]*"/\1="PANEL"/g' _site/index.html > /tmp/home-after.txt
```

- [ ] **Step 2: Diff against the baseline**

Run:
```bash
diff -wB /tmp/home-before.txt /tmp/home-after.txt && echo "IDENTICAL"
```
Expected: prints `IDENTICAL` (empty diff). The normalization collapsed the only intended change (panel id scheme); titles, dates, links, labels, body text, and order must match exactly.

If the diff is non-empty: each difference must be explained and resolved. Likely causes and fixes:
- A blurb was paraphrased/reflowed → restore verbatim text from git history (`git show HEAD~N:_posts/<file>`).
- A news item rendered "Read the paper" instead of "Read more on …" → that entry wrongly has `type` set, or the `site.data.papers contains item` guard misfired; confirm news entries have no `type`.
- An entry is missing → its `blurb` is absent (papers) or the entry was omitted from the data file.

- [ ] **Step 3: Confirm entry count unchanged**

Run:
```bash
grep -c 'accordion-navigation' /tmp/home-after.txt
```
Expected: the same number recorded in Task 1 Step 3.

- [ ] **Step 4: Confirm a clean production build**

Run:
```bash
JEKYLL_ENV=production bundle exec jekyll build 2>&1 | tee /tmp/build.log; grep -iE 'warning|deprecat|error' /tmp/build.log || echo "NO BUILD WARNINGS"
```
Expected: `NO BUILD WARNINGS` (or only pre-existing, unrelated warnings — none new from this change).

No commit (verification only).

---

## Task 7: Update `CLAUDE.md` architecture notes

**Files:**
- Modify: `CLAUDE.md` (the "Architecture" → homepage logic / content paragraphs)

- [ ] **Step 1: Update the Content and Homepage-logic descriptions**

In `CLAUDE.md`, the **Content** paragraph currently says posts go in `_posts/`. Add a sentence noting that recent activity is data-driven. Replace the **Content** paragraph with:

```markdown
**Content** lives in Markdown files with YAML front matter and in `_data/` YAML files. Narrative essay posts (≤2019) live in `_posts/` (organized in year subdirectories). Recent activity (2020+) lives in two data files: `_data/papers.yml` (comprehensive publications; an entry shows on the homepage only if it has a `blurb`) and `_data/highlights.yml` (talks and news). Static pages (`bio.md`, `research.md`, `teaching.md`, `advising.md`) sit at the root.
```

Replace the **Homepage logic** bullet with:

```markdown
**Homepage logic** (`index.html`): a data block renders `_data/papers.yml` entries that have a `blurb`, concatenated with all `_data/highlights.yml` entries and sorted by date; below it, an essay block renders `_posts/` content (excluding `special-layouts`/tools and the hidden 2011–2012 years). Each entry is rendered by `_includes/feed-entry.html`. The two blocks rely on the invariant that all data items are 2020+ and all essays are ≤2019, so they don't interleave.
```

- [ ] **Step 2: Build (sanity — CLAUDE.md is excluded from the build)**

Run:
```bash
JEKYLL_ENV=production bundle exec jekyll build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md: document data-driven homepage architecture

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final review (after all tasks)

- [ ] Dispatch a final code reviewer over the whole branch diff.
- [ ] Use superpowers:finishing-a-development-branch to open the PR (the predecessor Stage 1 shipped as PR #26; this is the Stage 2 follow-on).

## Out of scope (do not do here)

- Touching the `_posts/tools/` entries or the `tools.html` page (legacy; separate decision).
- Migrating the ≤2019 narrative essays.
- Building a dedicated publications page or any BibTeX generation (Stage 3).
