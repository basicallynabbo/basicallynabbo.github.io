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
  <div class="pub-authors"><strong>N.K. Borah</strong></div>
  <div class="pub-journal">{{ talk.venue }} · {{ talk.award }}</div>
</div>
{% endfor %}
