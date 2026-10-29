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
`assets/js/protein.js` animates a small school of real ubiquitin fragments (PDB 1UBQ, Cα only)
that swim on their own. Each chain uses Verlet integration and position-based constraints: 3.8 Å
bonds, a minimum bend angle, excluded volume, and soft springs that keep its native helix or hairpin
shape. Heads wander on smooth noise and steer away from walls, from each other and, gently, from the
cursor. On the 404 page the chains stick together into an aggregate. It's a cartoon, not a force field.

## Local preview
```
bundle install
bundle exec jekyll serve
```
