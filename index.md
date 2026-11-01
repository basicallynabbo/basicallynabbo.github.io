---
layout: page
title: Nabajit Borah
show_title: false
protein: true
---

<section class="profile-section">
  <div class="profile-info">
    <h1 class="profile-name">
      <span class="line">Nabajit</span>
      <span class="line">Borah</span>
    </h1>
    <p class="profile-title">I work with generative deep learning models to design biomolecules.</p>
    <ul class="contact-links">
      <li><a href="mailto:nabajitkrb@gmail.com" aria-label="Email" title="Email"><span class="ico" style="--i: url('{{ '/assets/images/icons/gmail.svg' | relative_url }}')"></span></a></li>
      <li><a href="https://github.com/nabajitb" aria-label="GitHub" title="GitHub"><span class="ico" style="--i: url('{{ '/assets/images/icons/github.svg' | relative_url }}')"></span></a></li>
      <li><a href="https://scholar.google.com/citations?user=YEooiOMAAAAJ" aria-label="Google Scholar" title="Google Scholar"><span class="ico" style="--i: url('{{ '/assets/images/icons/google-scholar.svg' | relative_url }}')"></span></a></li>
      <li><a href="https://www.linkedin.com/in/nabajit/" aria-label="LinkedIn" title="LinkedIn"><span class="ico" style="--i: url('{{ '/assets/images/icons/linkedin.svg' | relative_url }}')"></span></a></li>
      <li><a href="https://x.com/TensorTwerker" aria-label="X (Twitter)" title="X (Twitter)"><span class="ico" style="--i: url('{{ '/assets/images/icons/twitter.svg' | relative_url }}')"></span></a></li>
      <li><a href="https://medium.com/@nabbo" aria-label="Medium" title="Medium"><span class="ico" style="--i: url('{{ '/assets/images/icons/medium.svg' | relative_url }}')"></span></a></li>
      <li><a class="cv-pill" href="{{ '/assets/Nabajit-resume-july.pdf' | relative_url }}">cv ↓</a></li>
    </ul>
  </div>
  <figure class="profile-photo">
    <img src="{{ '/assets/images/profile.webp' | relative_url }}" alt="Nabajit Borah" width="640" height="640">
    <figcaption>specimen: human bean · habitat: conserved motif</figcaption>
  </figure>
</section>

## About

<div class="currently">
  <span class="currently-label">Currently</span>
  <span>Founding Computational Biologist at <strong><a href="https://www.litefold.ai/" rel="noopener">LiteFold</a></strong></span>
</div>

## Selected publications

<div class="section">
{% for pub in site.data.publications %}{% if pub.selected %}{% include pub.html pub=pub %}{% endif %}{% endfor %}
<p class="more-link"><a href="{{ '/publications/' | relative_url }}">All publications →</a></p>
</div>

## Log

<div class="section">
  <div class="news-item">
    <span class="news-date">June 2026</span>
    <span>Joined LiteFold as Founding Computational Biologist</span>
  </div>
  <div class="news-item">
    <span class="news-date">Dec 2025</span>
    <span>Started Master Thesis guided by Dr. Lipi Thukral in Computational Structural Biology Lab, CSIR IGIB</span>
  </div>
  <!-- removed news item -->
  <div class="news-item">
    <span class="news-date">May 2025</span>
    <span>Summer Intern under Dr. Mary Ekka, Biophysics Lab, CSIR IGIB</span>
  </div>
  <div class="news-item">
    <span class="news-date">2025</span>
    <span>3rd Place, Oral Presentation at FAVBS-2025</span>
  </div>
</div>
