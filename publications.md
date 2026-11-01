---
layout: page
title: Publications
show_title: false
---

## Book chapters

{% for pub in site.data.publications %}{% include pub.html pub=pub %}{% endfor %}

## Conference presentations

{% for talk in site.data.talks %}
<div class="pub-item">
  <div class="pub-title">{{ talk.title }}</div>
  <div class="pub-authors">{{ talk.authors }}</div>
  <div class="pub-journal">{{ talk.venue }} · {{ talk.award }}</div>
  {% if talk.link %}<div class="pub-links"><a href="{{ talk.link }}">linkedin post</a></div>{% endif %}
</div>
{% endfor %}
