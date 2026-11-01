---
layout: page
title: Nabajit Borah
show_title: false
protein: true
---

<section class="profile-section">
  <div class="profile-info">
    <p class="profile-kicker">field notes · protein structure × ai</p>
    <h1 class="profile-name">
      <span class="line">Nabajit</span>
      <span class="line">Borah</span>
    </h1>
    <p class="profile-title">Founding Computational Biologist at <strong>LiteFold</strong>. I use machine learning to read more out of protein structure and experimental data.</p>
    <ul class="contact-links">
      <li><span class="idx">01</span><a href="mailto:nabajitkrb@gmail.com">mail</a></li>
      <li><span class="idx">02</span><a href="https://github.com/basicallynabbo">github</a></li>
      <li><span class="idx">03</span><a href="https://scholar.google.com/citations?user=YEooiOMAAAAJ">scholar</a></li>
      <li><span class="idx">04</span><a href="https://www.linkedin.com/in/nabajit/">linkedin</a></li>
      <li><span class="idx">05</span><a href="https://x.com/TensorTwerker">x / twitter</a></li>
      <li><span class="idx">06</span><a href="https://medium.com/@nabbo">medium</a></li>
      <li><span class="idx">07</span><a class="cv-pill" href="{{ '/assets/Nabajit-resume-july.pdf' | relative_url }}">cv ↓</a></li>
    </ul>
    <div class="hero-hint" aria-hidden="true">
      <p>↓ scroll · click the water to gather the chains</p>
      <p>fragments of ubiquitin · <a href="https://www.rcsb.org/structure/1UBQ">pdb 1ubq</a> · cα traces</p>
      <p><span class="dot" style="background:var(--ss-helix)"></span>helix<span class="dot" style="background:var(--ss-strand)"></span>strand<span class="dot" style="background:var(--ss-loop)"></span>loop</p>
    </div>
  </div>
  <figure class="profile-photo">
    <img src="{{ '/images/profile.webp' | relative_url }}" alt="Nabajit Borah" width="320" height="320">
    <figcaption>specimen: n. borah · habitat: wet lab → dry lab</figcaption>
  </figure>
</section>

<div class="sequence-divider" aria-hidden="true"></div>

## About

<div class="currently">
  <span class="currently-label">Currently</span>
  <span>Founding Computational Biologist at <strong>LiteFold</strong> · Master's thesis in the Computational Structural Biology Lab, CSIR-IGIB (Dr. Lipi Thukral)</span>
</div>

<p class="intro lede">My interests sit at the intersection of AI, protein structure, and disease modeling. I’m drawn to problems where AI can speed up hypothesis generation and discovery. Working across wet and dry labs showed me how rich experimental biology data is and how much more we can extract with good computational models. Recently, I’ve been sharpening my math and coding to use that data better. The best way to contact me is via email: <span class="email-highlight">nabajitkrb@gmail.com</span></p>

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
