---
layout: page
title: Nabajit Borah
show_title: false
protein: true
---

<div class="profile-section">
  <div class="profile-info">
    <p class="profile-kicker">// computational biology</p>
    <h1 class="profile-name">Nabajit Borah</h1>
    <p class="profile-title">Founding Computational Biologist at LiteFold · protein structure × AI</p>
    <div class="contact-links">
      <a href="mailto:nabajitkrb@gmail.com"><img src="{{ '/images/icons/gmail.svg' | relative_url }}" alt="" class="icon"> Mail</a>
      <a href="https://github.com/basicallynabbo"><img src="{{ '/images/icons/github.svg' | relative_url }}" alt="" class="icon"> GitHub</a>
      <a href="https://scholar.google.com/citations?user=YEooiOMAAAAJ"><img src="{{ '/images/icons/google-scholar.svg' | relative_url }}" alt="" class="icon"> Scholar</a>
      <a href="https://www.linkedin.com/in/nabajit/"><img src="{{ '/images/icons/linkedin.svg' | relative_url }}" alt="" class="icon"> LinkedIn</a>
      <a href="https://x.com/TensorTwerker"><img src="{{ '/images/icons/twitter.svg' | relative_url }}" alt="" class="icon"> Twitter</a>
      <a href="https://medium.com/@nabbo"><img src="{{ '/images/icons/medium.svg' | relative_url }}" alt="" class="icon"> Medium</a>
      <a class="cv-pill" href="{{ '/assets/Nabajit-resume-july.pdf' | relative_url }}">CV ↓</a>
    </div>
    <div class="hero-hint" aria-hidden="true">
      <p>ubiquitin · <a href="https://www.rcsb.org/structure/1UBQ">PDB 1UBQ</a> · 76 Cα · native contacts Q = <span data-q>1.00</span></p>
      <p>move → it follows · stop → it folds · hover the fold → inspect a residue</p>
      <p><span class="dot" style="background:var(--ss-helix)"></span>helix<span class="dot" style="background:var(--ss-strand)"></span>strand<span class="dot" style="background:var(--ss-loop)"></span>loop</p>
    </div>
  </div>
  <div class="profile-photo">
    <img src="{{ '/images/profile.webp' | relative_url }}" alt="Nabajit Borah" width="320" height="320">
  </div>
</div>

<div class="currently">
  <span class="currently-label">Currently</span>
  <span>Founding Computational Biologist at <strong>LiteFold</strong> · Master's thesis in the Computational Structural Biology Lab, CSIR-IGIB (Dr. Lipi Thukral)</span>
</div>

<p class="intro">My interests sit at the intersection of AI, protein structure, and disease modeling. I’m drawn to problems where AI can speed up hypothesis generation and discovery. Working across wet and dry labs showed me how rich experimental biology data is and how much more we can extract with good computational models. Recently, I’ve been sharpening my math and coding to use that data better. The best way to contact me is via email: <span class="email-highlight">nabajitkrb@gmail.com</span></p>

## Selected publications

<div class="section">
{% for pub in site.data.publications %}{% if pub.selected %}{% include pub.html pub=pub %}{% endif %}{% endfor %}
<p class="more-link"><a href="{{ '/publications/' | relative_url }}">All publications →</a></p>
</div>

## News

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
