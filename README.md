# nabajitb.github.io

Personal website: **https://nabajitb.github.io**

Built with Jekyll and hosted on GitHub Pages.

```bash
bundle install && bundle exec jekyll serve
```

## Layout

| Path | What it holds |
| --- | --- |
| `index.md`, `work.md`, `publications.md`, `blogs.md` | The top-level pages |
| `projects/` | Project pages (the PIK3CA thesis page, with its own `assets/css/pik3ca.css` and `assets/js/pik3ca.js`) |
| `_data/` | Projects, experience, publications and talks, as YAML |
| `_blogs/` | Posts, imported from [Medium](https://medium.com/@nabbo) weekly by `scripts/import_medium.py` |
| `assets/data/pik3ca/` | Structures and results the thesis page's charts and 3D viewers load |

## Reading list

The home page's Reading section shows the five newest Bluesky posts from `bluesky.handle` that carry `#bluesky.tag`
(both in `_config.yml`). `assets/js/reading.js` reads them in the browser from Bluesky's public API, so a new, edited
or deleted post shows up on the next page load with no rebuild. The section stays hidden until there is a tagged post.

## Link previews

`assets/og.png` is the default link-preview card. The thesis page has its own, made by:

```bash
python3 scripts/make_og.py --fonts DIR   # DIR: Fraunces.ttf, PlexMono-Regular.ttf, PlexMono-Medium.ttf from github.com/google/fonts
```
