#!/usr/bin/env python3
"""Import Medium posts (from the RSS feed) into the Jekyll `_blogs` collection.

- Each post becomes _blogs/<slug>.md with front matter + the post HTML.
- Images are downloaded to assets/images/blogs/<slug>/ and links rewritten.
- Posts that already exist are skipped, so manual edits are kept.

Usage: python3 scripts/import_medium.py [--force]
"""
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

FEED = "https://medium.com/feed/@nabbo"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, "_blogs")
IMG_DIR = os.path.join(ROOT, "assets", "images", "blogs")
NS = {"content": "http://purl.org/rss/1.0/modules/content/"}
UA = {"User-Agent": "Mozilla/5.0 (medium-import; +https://nabajitb.github.io)"}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(), r.headers.get("Content-Type", "")


def slug_from_link(link):
    path = urllib.parse.urlparse(link).path.rstrip("/").split("/")[-1]
    return re.sub(r"-[0-9a-f]{8,}$", "", path)


def slugify(text):
    text = re.sub(r"<[^>]+>", "", html.unescape(text)).lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:60] or "section"


def ext_for(url, ctype):
    m = re.search(r"\.(png|jpe?g|gif|webp|svg)$", url, re.I)
    if m:
        return m.group(1).lower().replace("jpeg", "jpg")
    for k, v in (("png", "png"), ("jpeg", "jpg"), ("gif", "gif"), ("webp", "webp"), ("svg", "svg")):
        if k in ctype:
            return v
    return "jpg"


def clean_body(body, slug):
    # Drop Medium's tracking pixel.
    body = re.sub(r'<img[^>]+medium\.com/_/stat[^>]*>', "", body)

    # Embedly iframes -> direct embed (e.g. YouTube).
    def fix_iframe(m):
        src = html.unescape(m.group(1))
        q = urllib.parse.parse_qs(urllib.parse.urlparse(src).query)
        real = q.get("src", [src])[0]
        return ('<div class="embed"><iframe src="%s" loading="lazy" allowfullscreen '
                'frameborder="0"></iframe></div>' % html.escape(real, quote=True))
    body = re.sub(r'<iframe[^>]*src="([^"]+)"[^>]*>\s*</iframe>', fix_iframe, body)

    # Medium uses h3/h4 for section headings; shift up so the site TOC sees h2/h3.
    body = re.sub(r"<(/?)h4>", r"<\1h3_>", body)
    body = re.sub(r"<(/?)h3>", r"<\1h2>", body)
    body = body.replace("<h3_>", "<h3>").replace("</h3_>", "</h3>")

    seen = {}

    def add_id(m):
        tag, inner = m.group(1), m.group(2)
        base = slugify(inner)
        seen[base] = seen.get(base, 0) + 1
        hid = base if seen[base] == 1 else "%s-%d" % (base, seen[base])
        return '<%s id="%s">%s</%s>' % (tag, hid, inner, tag)
    body = re.sub(r"<(h2|h3)>(.*?)</\1>", add_id, body, flags=re.S)

    # Download images.
    os.makedirs(os.path.join(IMG_DIR, slug), exist_ok=True)
    count = [0]
    images = []

    def fix_img(m):
        tag = m.group(0)
        src = re.search(r'src="([^"]+)"', tag).group(1)
        if "cdn-images" not in src and "miro.medium.com" not in src:
            return tag
        count[0] += 1
        data, ctype = fetch(html.unescape(src))
        name = "%d.%s" % (count[0], ext_for(src, ctype))
        with open(os.path.join(IMG_DIR, slug, name), "wb") as f:
            f.write(data)
        local = "/assets/images/blogs/%s/%s" % (slug, name)
        images.append(local)
        tag = tag.replace(src, local)
        return tag.replace("<img ", '<img loading="lazy" ', 1)
    body = re.sub(r"<img[^>]*>", fix_img, body)

    return body.strip(), images


def first_paragraph(body):
    """Opening ~220 characters of body text, for the list-page excerpt."""
    paras = re.findall(r"<p>(.*?)</p>", body, flags=re.S)
    text = " ".join(html.unescape(re.sub(r"<br\s*/?>", " ", re.sub(r"</?(?!br)[a-z][^>]*>", "", p))) for p in paras)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= 220:
        return text
    return text[:220].rsplit(" ", 1)[0] + "…"


def main():
    force = "--force" in sys.argv
    xml, _ = fetch(FEED)
    items = ET.fromstring(xml).findall("./channel/item")
    os.makedirs(POSTS_DIR, exist_ok=True)
    added = 0
    for it in items:
        link = it.findtext("link").split("?")[0]
        slug = slug_from_link(link)
        out = os.path.join(POSTS_DIR, slug + ".md")
        if os.path.exists(out) and not force:
            continue
        title = it.findtext("title").strip()
        date = parsedate_to_datetime(it.findtext("pubDate"))
        tags = [c.text for c in it.findall("category")]
        raw = it.findtext("content:encoded", namespaces=NS) or ""
        body, images = clean_body(raw, slug)

        fm = ["---",
              "title: %s" % json.dumps(title, ensure_ascii=False),
              "date: %s" % date.strftime("%Y-%m-%d %H:%M:%S %z"),
              "tags: %s" % json.dumps(tags, ensure_ascii=False),
              "medium_url: %s" % json.dumps(link),
              "excerpt: %s" % json.dumps(first_paragraph(body), ensure_ascii=False)]
        if images:
            fm.append("image: %s" % json.dumps(images[0]))
        fm.append("---")
        with open(out, "w", encoding="utf-8") as f:
            f.write("\n".join(fm) + "\n\n{% raw %}\n" + body + "\n{% endraw %}\n")
        print("added", slug, "(%d images)" % len(images))
        added += 1
    print("done: %d new post(s)" % added)


if __name__ == "__main__":
    main()
