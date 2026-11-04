// Home-page Reading and Books lists, read from Bluesky's public API (no key, open to browsers).
//   Reading: the newest posts carrying #tag that link anything but a book.
//   Books:   posts linking a book page (Goodreads etc.) with #tag (started) or #done_tag (finished), paired by the
//            book, written as "Title by Author #reading <link>".
// Each heading and list stays hidden until it has something to show, so a failed request or an empty feed leaves the
// page as it was.
(function () {
  var box = document.querySelector('.reading[data-handle]');
  if (!box || !window.fetch) return;
  var handle = box.dataset.handle, tag = (box.dataset.tag || '').toLowerCase(), LIMIT = 10, MAX = 50;  // shown at first / shown after "Show more"
  var doneTag = (box.dataset.doneTag || '').toLowerCase(), books = document.querySelector('.books');
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var FEED = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?filter=posts_no_replies&limit=100&actor=' +
    encodeURIComponent(handle);
  var PAGES = 10;  // up to 1000 posts back, so finished books stay in the library

  function feature(f) { return f.features && f.features[0] || {}; }
  function isTag(f) { return feature(f).$type === 'app.bsky.richtext.facet#tag'; }
  // The post text without hashtags and without link text (Bluesky shows links shortened, e.g. "arxiv.org/abs/24…").
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
  function tagged(rec, name) {
    if (!name) return false;
    if ((rec.facets || []).some(function (f) { return isTag(f) && String(feature(f).tag).toLowerCase() === name; })) return true;
    return (rec.tags || []).some(function (t) { return String(t).toLowerCase() === name; });
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
    var l = linkOf(post);
    if (!l.u) return null;
    var src = source(l.u);
    return { uri: l.uri, source: src, title: usableTitle(l.card, src) || fallbackTitle(l.u) };
  }
  // Book pages. A book is keyed by its Goodreads id where there is one, so the start and finish posts pair up even
  // when one link carries a title slug or tracking parameters and the other does not.
  var BOOK_HOSTS = /(^|\.)(goodreads\.com|thestorygraph\.com|openlibrary\.org)$|^books\.google\./;
  function bookKey(u) {
    if (!u || !BOOK_HOSTS.test(u.hostname)) return null;
    var gr = u.pathname.match(/\/book\/show\/(\d+)/);
    return gr ? 'gr:' + gr[1] : (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '');
  }
  function linkOf(post) {
    var e = post.embed || {}, ext = e.external || (e.media && e.media.external);
    var uri = ext ? ext.uri : ((post.record.facets || []).map(feature).filter(function (t) {
      return t.$type === 'app.bsky.richtext.facet#link';
    })[0] || {}).uri;
    return { uri: uri, u: uri && parse(uri), card: ext && ext.title };
  }
  // "Title by Author" from the post text; else the link card's title. Subtitles go: "The Gene", not
  // "The Gene: An Intimate History".
  function bookName(text, card) {
    var m = (text || '').match(/^(.*\S)\s+by\s+(.+)$/i);
    var title = m ? m[1] : (text || usableTitle(card, '') || '');
    return { title: title.split(/:\s|\s[-–—]\s/)[0].replace(/[.…]+$/, '').trim(), author: m ? m[2].trim() : '' };
  }
  function month(d) { return MONTHS[d.getMonth()] + " '" + String(d.getFullYear() % 100).padStart(2, '0'); }
  // "since Jun '26" while reading; "Jun–Sep '26", "Sep '26" or "Dec '25–Feb '26" once finished.
  function span(start, end) {
    if (!end) return start ? 'since ' + month(start) : '';
    if (!start || month(start) === month(end)) return month(end);
    if (start.getFullYear() === end.getFullYear()) return MONTHS[start.getMonth()] + '–' + month(end);
    return month(start) + '–' + month(end);
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

  // Pages through the feed with Bluesky's cursor; returns this account's own posts, newest first.
  function fetchPosts() {
    var all = [];
    function page(cursor, n) {
      return fetch(FEED + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (d) {
        (d && d.feed || []).forEach(function (f) {
          if (f.post && f.post.author && f.post.author.handle === handle) all.push(f.post);  // skip reposts
        });
        return d && d.cursor && n + 1 < PAGES ? page(d.cursor, n + 1) : all;
      });
    }
    return page(null, 0);
  }
  function reveal(section, id) {
    section.hidden = false;
    var h = document.getElementById(id);
    if (h) h.hidden = false;
  }

  function showPapers(posts) {
    var list = box.querySelector('.reading-list');
    posts.filter(function (p) { return tagged(p.record, tag) && !bookKey(linkOf(p).u); }).slice(0, MAX).forEach(function (p, i) {
      var postUrl = 'https://bsky.app/profile/' + handle + '/post/' + p.uri.split('/').pop();
      var when = shownDate(new Date(p.record.createdAt || p.indexedAt));
      var item = el('div', 'news-item reading-item');
      if (i >= LIMIT) item.hidden = true;  // revealed by the "Show more" button
      item.appendChild(el('span', 'news-date', when));
      // One line, like Log: the paper (or the post, if it links nothing) and a small source tag. The comment is the tooltip.
      var body = el('span', 'reading-body'), t = target(p), text = note(p.record);
      var a = body.appendChild(link(t ? t.uri : postUrl, t ? t.title : (text || 'Post')));
      if (t && text) a.title = text;
      if (t) body.appendChild(el('span', 'reading-src', t.source));
      item.appendChild(body);
      list.appendChild(item);
    });
    // Extra items beyond LIMIT sit behind a toggle; the posts are already fetched, so it costs no request.
    var extra = list.querySelectorAll('.reading-item[hidden]');
    if (extra.length) {
      var more = el('button', 'reading-toggle', 'Show ' + extra.length + ' more');
      more.type = 'button';
      more.setAttribute('aria-expanded', 'false');
      more.addEventListener('click', function () {
        var open = more.getAttribute('aria-expanded') !== 'true';
        Array.prototype.forEach.call(list.querySelectorAll('.reading-item:nth-child(n+' + (LIMIT + 1) + ')'), function (n) {
          n.hidden = !open;
        });
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
        more.textContent = open ? 'Show less' : 'Show ' + extra.length + ' more';
      });
      list.parentNode.insertBefore(more, list.nextSibling);
    }
    if (list.children.length) reveal(box, 'reading');
  }

  function showBooks(posts) {
    if (!books) return;
    var byKey = {}, order = [];
    // Oldest first, so a later post's wording (say, a fixed typo) wins.
    posts.slice().reverse().forEach(function (p) {
      var started = tagged(p.record, tag), finished = tagged(p.record, doneTag);
      var l = linkOf(p), key = (started || finished) && bookKey(l.u);
      if (!key) return;
      var b = byKey[key] || (byKey[key] = { uri: l.uri, start: null, end: null, name: null });
      var d = new Date(p.record.createdAt || p.indexedAt), name = bookName(note(p.record), l.card);
      if (name.title && (name.author || !b.name || !b.name.author)) b.name = name;
      if (started && (!b.start || d < b.start)) b.start = d;
      if (finished && (!b.end || d > b.end)) b.end = d;
      if (order.indexOf(key) === -1) order.push(key);
    });
    // Books in progress first (newest start first), then finished ones, most recently finished first.
    var list = order.map(function (k) { return byKey[k]; }).filter(function (b) { return b.name; }).sort(function (a, b) {
      if (!a.end !== !b.end) return a.end ? 1 : -1;
      return (b.end || b.start) - (a.end || a.start);
    });
    var box2 = books.querySelector('.books-list');
    list.forEach(function (b) {
      var item = el('div', 'news-item reading-item' + (b.end ? '' : ' is-current'));
      item.appendChild(el('span', 'news-date', span(b.start, b.end)));
      var body = el('span', 'reading-body');
      body.appendChild(link(b.uri, b.name.title));
      if (b.name.author) body.appendChild(el('span', 'reading-src', b.name.author));
      item.appendChild(body);
      box2.appendChild(item);
    });
    if (box2.children.length) reveal(books, 'books');
  }

  fetchPosts().then(function (posts) {
    showPapers(posts);
    showBooks(posts);
  }).catch(function () {});
})();
