---
layout: page
title: Work
show_title: false
redirect_from:
  - /about/
  - /research/
  - /experience/
---

## Research interests {#research}

<ul class="research-list">
  <li>Structural Biology</li>
  <li>Machine Learning in Drug Discovery</li>
  <li>Deep Learning for Structure Prediction</li>
</ul>

## Experience {#experience}

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">Founding Computational Biologist</span>
    <span class="timeline-date">June 2026 – Present</span>
  </div>
  <div class="timeline-place">LiteFold</div>
</div>

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">Master's Thesis</span>
    <span class="timeline-date">Dec 2025 – Present</span>
  </div>
  <div class="timeline-place">CSIR–Institute of Genomics and Integrative Biology, Computational Structural Biology Lab (Dr. Lipi Thukral)</div>
</div>

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">Research Intern</span>
    <span class="timeline-date">May 2025 – July 2025</span>
  </div>
  <div class="timeline-place">CSIR–Institute of Genomics and Integrative Biology, Biophysics Lab (Dr. Mary Ekka)</div>
</div>

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">Research Intern</span>
    <span class="timeline-date">May 2024 – July 2024</span>
  </div>
  <div class="timeline-place">CSIR–Institute of Genomics and Integrative Biology, Biophysics Lab (Dr. Mary Ekka)</div>
</div>

<div class="timeline-item">
  <div class="timeline-header">
    <span class="timeline-title">In-House Research Intern</span>
    <span class="timeline-date">May 2023 – July 2023</span>
  </div>
  <div class="timeline-place">Centre for Computational Biology and Bioinformatics, Amity Institute of Biotechnology</div>
</div>

## Projects {#projects}

<div class="project-grid">
{% for p in site.data.projects %}
  <article class="project-card">
    <p class="project-meta">{{ p.when }} · {{ p.where }}</p>
    <h3 class="project-title">{% if p.link %}<a href="{{ p.link }}">{{ p.title }}</a>{% else %}{{ p.title }}{% endif %}</h3>
    <p class="project-problem">{{ p.problem }}</p>
    <ul class="tag-list">{% for m in p.methods %}<li>{{ m }}</li>{% endfor %}</ul>
    <p class="project-outcome">{{ p.outcome }}</p>
  </article>
{% endfor %}
</div>

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
