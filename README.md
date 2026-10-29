# basicallynabbo.github.io

https://basicallynabbo.github.io (Jekyll on GitHub Pages)

## Editing content
- **Publications / talks:** `_data/publications.yml`, `_data/talks.yml`. Set `selected: true` to also show a paper on the homepage.
- **Projects:** `_data/projects.yml` (one card each on `/work/`).
- **Experience, education, skills:** `work.md`. Old `/about/`, `/research/` and `/experience/` URLs redirect here.
- **Blog posts:** add a Markdown file to `_blogs/`. The "Writing" menu link appears once there is at least one published post.
  Add `math: true` to the front matter for KaTeX (`$$...$$` inline or as its own block).
- **CV:** replace `assets/Nabajit-resume-july.pdf` (linked from the homepage and `/cv/`).

## The protein on the homepage
`assets/js/protein.js` simulates ubiquitin (PDB 1UBQ, 76 Cα) with Verlet integration and
position-based constraints: 3.8 Å bonds, a minimum bend angle, excluded volume, and a Gō model in
which the native contacts pull the chain back into its fold once the cursor stops. The `Q` shown
under the hero is the fraction of native contacts that are formed. It's a cartoon, not a force field.

## Local preview
```
bundle install
bundle exec jekyll serve
```
