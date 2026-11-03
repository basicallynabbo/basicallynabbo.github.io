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

## Reading and Books

Both home-page lists come from Bluesky posts by `bluesky.handle` (`_config.yml`), read in the browser by
`assets/js/reading.js` from Bluesky's public API, so new, edited or deleted posts show on the next page load with no
rebuild. Each list stays hidden until it has something to show.

- **Reading**: the seven newest posts tagged `#reading` (`bluesky.tag`) that link a paper, article or anything else.
- **Books**: posts linking a Goodreads (or StoryGraph / Open Library) book page. Start a book with
  `The Gene by Siddhartha Mukherjee #reading <link>`; finish it by posting the same book with `#completed`
  (`bluesky.done_tag`). The two posts pair up by the book's Goodreads id, and the list shows "since Jun '26" while
  reading and "Jun–Sep '26" once finished. Without "by Author", the title comes from the link card.

## PIK3CA sampling trajectories

The four looping viewers on the thesis page (`assets/data/pik3ca/traj/`) are made by `scripts/pik3ca_traj/`:

- `pod/`: GPU runs. `px_traj.py` and `bz_traj.py` wrap `protenix pred` / `boltz predict` and save every 4th diffusion step;
  the `run_*.sh` scripts set up one conda env per tool under `/nabajit` and run the inputs in `pod/inputs/` (MSAs not
  included). DiffDock-L needs its receptor split into two chains (ESM embeds at most 1022 residues) and `dd_fix.sh`, since
  its `environment.yml` installs only the last pip block.
- `traj_frames.py`: puts each run in the crystal frame and counts distance and clashes per step (`flowdock_traj.py` makes
  the FlowDock input; `pose_eval.py` holds the crystal references and expects the thesis folder, `BENCH`).
- `build_site_assets.py <thesis dir> <site dir>`: writes the page data; `SHOWN_TRAJ` picks the runs shown.

## Link previews

`assets/og.png` is the default link-preview card. The thesis page has its own, made by:

```bash
python3 scripts/make_og.py --fonts DIR   # DIR: Fraunces.ttf, PlexMono-Regular.ttf, PlexMono-Medium.ttf from github.com/google/fonts
```

## Favicon

The "n_" monogram (`assets/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`) is drawn from the Fraunces "n" by
`python3 scripts/make_favicon.py --fonts DIR`, with the same fonts folder as above.
