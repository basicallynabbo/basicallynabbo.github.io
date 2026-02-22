# Academic Website - Nabajit Borah

Personal academic website built with Jekyll and hosted on GitHub Pages.

**Live Website:** https://basicallynabbo.github.io

---

## Quick Start

### Prerequisites
- Ruby (>= 2.6)
- Bundler

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/basicallynabbo/basicallynabbo.github.io.git
cd basicallynabbo.github.io
```

2. Install dependencies:
```bash
bundle install
```

3. Run locally:
```bash
bundle exec jekyll serve
```

4. Open http://localhost:4000 in your browser.

---

## Deployment to GitHub Pages

### Option 1: Push to GitHub (Automatic)

1. Create a new repository on GitHub: `basicallynabbo.github.io`
2. Push this code to the repository:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/basicallynabbo/basicallynabbo.github.io.git
git push -u origin main
```

3. GitHub Pages will automatically build and deploy your site.

### Option 2: Using GitHub CLI

```bash
gh repo create basicallynabbo.github.io --public --source=.
git add .
git commit -m "Initial academic website"
git push -u origin main
```

---

## Customization

### Update Personal Information

Edit `_config.yml` to update:
- Name, title, description
- Social links (GitHub, Google Scholar, LinkedIn, Twitter)
- Navigation menu

### Update Content

- **Home:** Edit `index.md`
- **About:** Edit `about.md`
- **Research:** Edit `research.md`
- **Publications:** Edit `publications.md`
- **Experience:** Edit `experience.md`
- **CV:** Edit `cv.md` and update PDF in `assets/`

### Add Profile Photo

1. Add your photo to `images/` folder (recommended: 400x400px, square)
2. Update `index.md` to reference it

---

## Features

- Clean academic design with serif fonts
- Responsive (mobile-friendly)
- Publications list with links
- Research interests section
- Experience timeline
- CV download option
- SEO optimized

---

## License

MIT License
