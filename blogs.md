---
layout: page
title: Blogs
show_title: false
permalink: /blogs/
---

## Blogs

{% assign sorted_blogs = site.blogs | sort: "date" | reverse %}
{% if sorted_blogs.size > 0 %}
{% for blog in sorted_blogs %}
<div class="pub-item">
  <div class="pub-title"><a href="{{ blog.url | relative_url }}">{{ blog.title }}</a></div>
  {% if blog.date %}
  <div class="pub-journal">{{ blog.date | date: "%B %d, %Y" }}</div>
  {% endif %}
  {% if blog.excerpt %}
  <div>{{ blog.excerpt | strip_html | truncate: 180 }}</div>
  {% endif %}
</div>
{% endfor %}
{% else %}
<p>No blog posts yet. Add markdown files to <code>_blogs/</code> to publish.</p>
{% endif %}
