---
layout: page
title: Work
show_title: false
redirect_from:
  - /about/
  - /research/
  - /experience/
---

## Projects {#projects}

{% assign theses = site.data.projects | where_exp: "p", "p.thesis" %}
{% assign others = site.data.projects | where_exp: "p", "p.thesis == nil" %}
{% for p in theses %}
<article class="thesis">
  <p class="thesis-side"><span>{{ p.when }}</span><span>{{ p.thesis }}</span></p>
  <div>
    <h3 class="thesis-title"><a href="{{ p.link | relative_url }}">{{ p.title }}</a></h3>
    <p class="thesis-summary">{{ p.summary }}</p>
    <a class="thesis-more" href="{{ p.link | relative_url }}">{{ p.cta }} <span aria-hidden="true">→</span></a>
  </div>
</article>
{% endfor %}

<h3 class="project-subhead">Other projects</h3>
<ul class="project-list">
{% for p in others %}
  <li class="project-row">
    <span class="project-when">{{ p.when }}</span>
    <div>
      <p class="project-name">{% if p.link %}<a href="{{ p.link }}">{{ p.title }} <span aria-hidden="true">→</span></a>{% else %}{{ p.title }}{% endif %}</p>
      <p class="project-line">{{ p.outcome }} <span class="project-where">{{ p.where }}</span></p>
      <ul class="tag-list">{% for m in p.methods %}<li>{{ m }}</li>{% endfor %}</ul>
    </div>
  </li>
{% endfor %}
</ul>

## Experience {#experience}

{% for job in site.data.experience %}
<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">{{ job.title }}</span>
    <span class="timeline-date">{{ job.dates }}</span>
  </div>
  <div class="timeline-place">{{ job.place }}</div>
</div>
{% endfor %}

## Education {#education}

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">B.Tech + M.Tech Biotechnology (Integrated)</span>
    <span class="timeline-date">2021 – Present</span>
  </div>
  <div class="timeline-place">Amity University, Noida, India · CGPA 9.2/10</div>
  <ul class="tag-list">
    <li>Computational Biology</li><li>Machine Learning</li><li>Biostatistics</li><li>Python Programming</li>
    <li>Recombinant Biotechnology</li><li>Cancer Biology</li><li>Tissue Engineering</li>
  </ul>
</div>

## Skills {#skills}

<div class="skill-grid">
  <div>
    <h3>Programming &amp; ML</h3>
    <ul class="tag-list"><li>Python</li><li>Scikit-learn</li><li>Keras</li><li>Pandas</li><li>NumPy</li><li>Linux</li></ul>
  </div>
  <div>
    <h3>Structural &amp; computational</h3>
    <ul class="tag-list"><li>MD simulation</li><li>AutoDock</li><li>PyMOL</li><li>Schrödinger Suite</li><li>Gene expression analysis</li><li>ADMET analysis</li></ul>
  </div>
  <div>
    <h3>Wet lab</h3>
    <ul class="tag-list"><li>EMSA</li><li>GPC</li><li>BCA assay</li><li>SDS-PAGE</li><li>Gel electrophoresis</li><li>PCR</li><li>ELISA</li></ul>
  </div>
</div>

## Leadership & Activities

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">President</span>
    <span class="timeline-date">2022 – 2025</span>
  </div>
  <div class="timeline-place">Illuminati Technical Club, Amity University</div>
  <ul class="timeline-desc">
    <li>Organized 5+ workshops on Hands-on Bioinformatics and AI</li>
    <li>Led technical initiatives and student engagement activities</li>
  </ul>
</div>

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">Technical Head</span>
    <span class="timeline-date">2023</span>
  </div>
  <div class="timeline-place">ICEIL-2023 Symposium on Technopreneurship in Life Sciences</div>
</div>

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">Core Technical Team</span>
    <span class="timeline-date">2023, 2024</span>
  </div>
  <div class="timeline-place">Amity Youth Fest</div>
</div>

## Volunteering

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">Teacher & Social Media Strategist</span>
    <span class="timeline-date">Feb – Apr 2023</span>
  </div>
  <div class="timeline-place">Pehechaan – The Street School (NGO), New Delhi</div>
  <ul class="timeline-desc">
    <li>Taught math, English, and science to children aged 8–13</li>
    <li>Increased NGO's social media visibility by 25% using KPIs and content strategies</li>
    <li>Managed content for Facebook, Instagram, Twitter, and LinkedIn</li>
  </ul>
</div>

## Beyond the lab {#beyond}

<div class="skill-grid">
  <div>
    <h3>Languages</h3>
    <ul class="tag-list"><li>English (professional)</li><li>Hindi (professional)</li><li>Assamese (native)</li><li>German (elementary)</li></ul>
  </div>
  <div>
    <h3>Interests</h3>
    <ul class="tag-list"><li>Photography</li><li>Music</li><li>Cinema</li></ul>
  </div>
</div>
