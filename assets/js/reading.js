// Home-page Reading list: the newest Bluesky posts carrying the configured #tag, read from Bluesky's public API
// (no key, open to browsers). The heading and list stay hidden until at least one tagged post comes back, so a
// failed request or an empty feed leaves the page as it was.
(function () {
  var box = document.querySelector('.reading[data-handle]');
  if (!box || !window.fetch) return;
  var handle = box.dataset.handle, tag = (box.dataset.tag || '').toLowerCase(), LIMIT = 7;
  var url = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?filter=posts_no_replies&limit=100&actor=' +
    encodeURIComponent(handle);

  function feature(f) { return f.features && f.features[0] || {}; }
  function isTag(f) {
    var t = feature(f);
    return t.$type === 'app.bsky.richtext.facet#tag' && String(t.tag).toLowerCase() === tag;
  }
  // The post text without the tag and without link text (Bluesky shows links shortened, e.g. "arxiv.org/abs/24…").
  // Facet offsets are UTF-8 byte offsets, so cut on the encoded bytes.
  function note(rec) {
    var bytes = new TextEncoder().encode(rec.text || ''), cuts = (rec.facets || []).filter(function (f) {
      var t = feature(f).$type;
      return isTag(f) || t === 'app.bsky.richtext.facet#link';
    }).map(function (f) { return [f.index.byteStart, f.index.byteEnd]; }).sort(function (a, b) { return a[0] - b[0]; });
    var parts = [], at = 0;
    cuts.forEach(function (c) { if (c[0] >= at) parts.push(bytes.slice(at, c[0])); at = Math.max(at, c[1]); });
    parts.push(bytes.slice(at));
    var dec = new TextDecoder();
    return parts.map(function (p) { return dec.decode(p); }).join('').replace(/\s+/g, ' ').trim();
  }
  function tagged(rec) {
    if ((rec.facets || []).some(isTag)) return true;
    return (rec.tags || []).some(function (t) { return String(t).toLowerCase() === tag; });
  }
  // Where a paper link comes from, by host; the longest match wins, so PubMed beats the wider ncbi.nlm.nih.gov.
  var SOURCES = {
    'arxiv.org': 'arXiv', 'alphaxiv.org': 'arXiv', 'biorxiv.org': 'bioRxiv', 'medrxiv.org': 'medRxiv',
    'chemrxiv.org': 'ChemRxiv', 'researchsquare.com': 'Research Square', 'ssrn.com': 'SSRN', 'preprints.org': 'Preprints.org',
    'nature.com': 'Nature', 'science.org': 'Science', 'cell.com': 'Cell', 'pnas.org': 'PNAS', 'pubs.acs.org': 'ACS',
    'pubs.rsc.org': 'RSC', 'elifesciences.org': 'eLife', 'plos.org': 'PLOS', 'embopress.org': 'EMBO Press',
    'academic.oup.com': 'Oxford Academic', 'onlinelibrary.wiley.com': 'Wiley', 'link.springer.com': 'Springer',
    'springer.com': 'Springer', 'sciencedirect.com': 'ScienceDirect', 'thelancet.com': 'The Lancet', 'nejm.org': 'NEJM',
    'jbc.org': 'JBC', 'mdpi.com': 'MDPI', 'frontiersin.org': 'Frontiers', 'biomedcentral.com': 'BMC',
    'annualreviews.org': 'Annual Reviews', 'iucr.org': 'IUCr', 'rcsb.org': 'RCSB PDB',
    'pubmed.ncbi.nlm.nih.gov': 'PubMed', 'pmc.ncbi.nlm.nih.gov': 'PMC', 'ncbi.nlm.nih.gov': 'NCBI', 'europepmc.org': 'Europe PMC',
    'semanticscholar.org': 'Semantic Scholar', 'openreview.net': 'OpenReview', 'proceedings.neurips.cc': 'NeurIPS',
    'neurips.cc': 'NeurIPS', 'proceedings.mlr.press': 'PMLR', 'aclanthology.org': 'ACL Anthology', 'jmlr.org': 'JMLR',
    'huggingface.co': 'Hugging Face', 'github.com': 'GitHub', 'distill.pub': 'Distill', 'substack.com': 'Substack',
    'medium.com': 'Medium'
  };
  // DOI prefixes, for doi.org links (and as a fallback for publisher hosts not listed above).
  var DOI_SOURCES = {
    '10.1038': 'Nature', '10.1126': 'Science', '10.1016': 'Elsevier', '10.1101': 'bioRxiv', '10.26434': 'ChemRxiv',
    '10.48550': 'arXiv', '10.1073': 'PNAS', '10.1021': 'ACS', '10.1039': 'RSC', '10.7554': 'eLife', '10.1371': 'PLOS',
    '10.1093': 'Oxford Academic', '10.1002': 'Wiley', '10.1111': 'Wiley', '10.1007': 'Springer', '10.1186': 'BMC',
    '10.15252': 'EMBO Press', '10.1056': 'NEJM', '10.3390': 'MDPI', '10.3389': 'Frontiers', '10.1146': 'Annual Reviews',
    '10.1107': 'IUCr', '10.21203': 'Research Square', '10.2139': 'SSRN', '10.1145': 'ACM', '10.1109': 'IEEE'
  };
  function parse(uri) { try { return new URL(uri); } catch (e) { return null; } }
  function doiOf(u) {
    var path = u.pathname + u.search;
    try { path = decodeURIComponent(path); } catch (e) {}
    var m = path.match(/\b(10\.\d{4,9}\/[^\s?#]+)/);
    return m ? m[1].replace(/\/(full|abstract|pdf|epdf)$|\.(full|pdf)$|v\d+(\.full)?$/i, '') : null;
  }
  function source(u) {
    var host = u.hostname.replace(/^www\./, ''), best = '';
    Object.keys(SOURCES).forEach(function (k) {
      if ((host === k || host.slice(-k.length - 1) === '.' + k) && k.length > best.length) best = k;
    });
    if (best) return SOURCES[best];
    var doi = doiOf(u);
    if (doi && DOI_SOURCES[doi.split('/')[0]]) return DOI_SOURCES[doi.split('/')[0]];
    return host === 'doi.org' || host === 'dx.doi.org' ? 'DOI' : host;
  }
  // A readable stand-in when the link card has no usable title: the paper's id where the address has one, else the
  // bare address. The source name is shown on its own line, so it is not repeated here.
  function fallbackTitle(u) {
    var host = u.hostname.replace(/^www\./, ''), path = u.pathname;
    var arxiv = /(^|\.)(arxiv|alphaxiv)\.org$|^huggingface\.co$/.test(host) &&
      path.match(/\/(?:abs|pdf|html|papers|overview)\/(\d{4}\.\d{4,5})/);
    if (arxiv) return 'arXiv:' + arxiv[1];
    var pmid = host === 'pubmed.ncbi.nlm.nih.gov' && path.match(/^\/(\d+)/);
    if (pmid) return 'PMID ' + pmid[1];
    var pmc = path.match(/\b(PMC\d+)/i);
    if (pmc) return pmc[1].toUpperCase();
    var doi = doiOf(u);
    if (doi) return 'doi:' + doi;
    return (host + path).replace(/\/$/, '');
  }
  // Publishers behind bot checks hand link-card fetchers a placeholder page instead of the paper.
  function usableTitle(t, src) {
    t = (t || '').trim();
    if (!t || t.toLowerCase() === src.toLowerCase()) return '';
    if (/^(just a moment|attention required|access denied|are you a robot|verify you are human|redirecting|loading|403|404|page not found|error)\b/i.test(t)) return '';
    return t;
  }
  // What the post points at: its link card, else the first link in the text.
  function target(post) {
    var e = post.embed || {};
    var ext = e.external || (e.media && e.media.external);
    var uri = ext ? ext.uri : ((post.record.facets || []).map(feature).filter(function (t) {
      return t.$type === 'app.bsky.richtext.facet#link';
    })[0] || {}).uri;
    var u = uri && parse(uri);
    if (!u) return null;
    var src = source(u);
    return { uri: uri, source: src, title: usableTitle(ext && ext.title, src) || fallbackTitle(u) };
  }
  // "Today", "Yesterday", then dd/mm/yy ("15/07/26"). Days are the reader's local days.
  function shownDate(d) {
    var start = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var days = Math.round((start(new Date()) - start(d)) / 864e5);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    var two = function (n) { return (n < 10 ? '0' : '') + n; };
    return two(d.getDate()) + '/' + two(d.getMonth() + 1) + '/' + two(d.getFullYear() % 100);
  }
  function el(name, cls, text) {
    var n = document.createElement(name);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function link(href, text, cls) {
    var a = el('a', cls, text);
    a.href = href;
    a.rel = 'noopener';
    return a;
  }

  fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    var posts = (d && d.feed || []).map(function (f) { return f.post; }).filter(function (p) {
      return p && p.author && p.author.handle === handle && tagged(p.record);  // skip reposts of other people's posts
    }).slice(0, LIMIT);
    if (!posts.length) return;
    var list = box.querySelector('.reading-list');
    posts.forEach(function (p) {
      var postUrl = 'https://bsky.app/profile/' + handle + '/post/' + p.uri.split('/').pop();
      var when = shownDate(new Date(p.record.createdAt || p.indexedAt));
      var item = el('div', 'news-item reading-item');
      item.appendChild(el('span', 'news-date', when));
      // One line, like Log: the paper (or the post, if it links nothing) and a small source tag. The comment is the tooltip.
      var body = el('span', 'reading-body'), t = target(p), text = note(p.record);
      var a = body.appendChild(link(t ? t.uri : postUrl, t ? t.title : (text || 'Post')));
      if (t && text) a.title = text;
      if (t) body.appendChild(el('span', 'reading-src', t.source));
      item.appendChild(body);
      list.appendChild(item);
    });
    box.hidden = false;
    var h = document.getElementById('reading');
    if (h) h.hidden = false;
  }).catch(function () {});
})();
