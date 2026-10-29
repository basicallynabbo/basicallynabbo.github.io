---
layout: page
title: Writing
show_title: false
permalink: /blogs/
---

## Writing

{% assign sorted_blogs = site.blogs | sort: "date" | reverse %}
{% if sorted_blogs.size > 0 %}
{% for blog in sorted_blogs %}
{% assign words = blog.content | strip_html | number_of_words %}
<div class="pub-item">
  <div class="pub-title"><a href="{{ blog.url | relative_url }}">{{ blog.title }}</a></div>
  <div class="pub-journal">{% if blog.date %}{{ blog.date | date: "%B %-d, %Y" }} · {% endif %}{{ words | divided_by: 200 | plus: 1 }} min read</div>
  {% if blog.excerpt %}<div>{{ blog.excerpt | strip_html | truncate: 180 }}</div>{% endif %}
</div>
{% endfor %}
{% else %}
<p>Nothing here yet. Posts are on the way.</p>
{% endif %}
