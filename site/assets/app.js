const source = 'https://github.com/tarn-lng/tarn/blob/main/';
const registry = 'https://tarn-lng.github.io/registry/';
const content = document.querySelector('#content');
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const block = s => `<div class="command-block"><button class="copy" type="button" aria-label="Copy command">Copy</button><pre><code>${escape(s)}</code></pre></div>`;
const page = (label, title, intro, body) => `<section class="page"><div class="section-label">${label}</div><h1>${title}</h1><p class="page-intro">${intro}</p>${body}</section>`;
const doc = (path, title, note) => `<a href="${source}docs/${path}.md">${title} ↗<span>${note}</span></a>`;

function renderMarkdown(md) {
  if (!md) return '';
  let text = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Extract fenced code blocks
  const codeBlocks = [];
  text = text.replace(/```([a-zA-Z0-9_\-\.\+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ lang: lang.trim(), code: code.replace(/\n$/, '') });
    return id;
  });

  const lines = text.split('\n');
  const out = [];
  let inList = null;
  let inTable = false;
  let tableHeader = [];
  let tableRows = [];

  function closeList() {
    if (inList) {
      out.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  }

  function closeTable() {
    if (inTable || tableHeader.length > 0) {
      let html = '<div class="table-wrap"><table>';
      if (tableHeader.length) {
        html += '<thead><tr>' + tableHeader.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead>';
      }
      if (tableRows.length) {
        html += '<tbody>' + tableRows.map(row => '<tr>' + row.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody>';
      }
      html += '</table></div>';
      out.push(html);
      inTable = false;
      tableHeader = [];
      tableRows = [];
    }
  }

  function inline(s) {
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^\*])\*([^*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
    s = s.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3');
    return s;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const cbMatch = line.trim().match(/^__CODE_BLOCK_(\d+)__$/);
    if (cbMatch) {
      closeList();
      closeTable();
      const cb = codeBlocks[parseInt(cbMatch[1], 10)];
      const langBadge = cb.lang ? `<span class="code-lang">${escape(cb.lang)}</span>` : '';
      const escCode = cb.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      out.push(`<div class="command-block"><button class="copy" type="button" aria-label="Copy code">Copy</button>${langBadge}<pre><code>${escCode}</code></pre></div>`);
      continue;
    }

    if (/^(\-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      closeList();
      closeTable();
      out.push('<hr class="readme-hr">');
      continue;
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closeList();
      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        inTable = true;
        continue;
      }
      if (!inTable) {
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      closeTable();
    }

    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      closeList();
      const level = hMatch[1].length;
      out.push(`<h${level}>${inline(hMatch[2])}</h${level}>`);
      continue;
    }

    if (line.startsWith('>')) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }

    const ulMatch = line.match(/^(\s*)[-\*]\s+(.*)$/);
    if (ulMatch) {
      if (inList !== 'ul') {
        closeList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${inline(ulMatch[2])}</li>`);
      continue;
    }

    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inList !== 'ol') {
        closeList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${inline(olMatch[2])}</li>`);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  closeTable();

  return out.join('\n');
}

let cachedCatalog = null;
async function getCatalog() {
  if (cachedCatalog) return cachedCatalog;
  const response = await fetch('catalog.json');
  if (!response.ok) throw new Error('Catalog unavailable');
  const data = await response.json();
  if (data.schema_version !== 1 || !Array.isArray(data.packages)) throw new Error('Invalid catalog');
  cachedCatalog = data;
  return data;
}

const pages = {
  install: () => page('GET STARTED', 'Build your first<br><em>Tarn program.</em>', 'The current supported target is Linux x86_64. Tarn is experimental; install from source with the Rust toolchain and a native C compiler.', `<div class="prose"><div class="notice">There are no downloadable compiler releases yet. These instructions build the actual toolchain from source; no placeholder download or install script.</div><h2>01 · Build the toolchain</h2><p>Install Git, a current stable Rust toolchain with Rust 2024 support, and your distribution's C build tools. Then:</p>${block('git clone https://github.com/tarn-lng/tarn.git\ncd tarn\ncargo build --release -p tarn -p tarn-lsp\n./target/release/tarn --help')}<p>The CLI is <code>target/release/tarn</code>; the language server is <code>target/release/tarn-lsp</code>. Put these binaries in a directory on your PATH if desired.</p><h2>02 · Create and run a project</h2>${block('tarn init hello\ncd hello\ntarn run\ntarn check --json\ntarn test')}<h2>03 · Add a package</h2>${block('tarn add dbus --registry ' + registry + '\ntarn build --link dbus-1')}<p>D-Bus requires libdbus-1 development files. Imports do not grant native linking authority; <code>--link</code> is explicit.</p><h2>Editor support</h2><p>The repository includes the VS Code extension under <code>editors/vscode</code>. Follow its setup instructions and point it at the compiler's LSP binary.</p><a class="text-link" href="${source}editors/vscode/README.md">VS Code setup ↗</a><h2>Published versions</h2><a class="button secondary" href="https://github.com/tarn-lng/tarn/releases">Check GitHub Releases ↗</a></div>`),
  learn: () => page('LANGUAGE GUIDE', 'Readable code.<br>Explicit decisions.', 'A practical introduction to today’s Tarn, with links to the canonical specification and detailed guides.', `<div class="content-grid"><aside class="side-nav"><a href="#learn">Language basics</a><a href="#ownership">Ownership</a><a href="#errors">Errors</a><a href="#stdlib">Standard library</a><a href="#cli">Toolchain</a></aside><div class="prose"><h2>Bindings and functions</h2><p>Immutable bindings use <code>:=</code>. Mutable declarations use <code>var</code> and <code>=</code>. Return statements are explicit.</p>${block('fn add(a i32, b i32) i32 {\n    return a + b\n}\n\nfn main() {\n    result := add(2, 3)\n    var counter = result\n    counter = counter + 1\n    print(counter)\n}')}<h2>Predictable control flow</h2><p>No semicolons, implicit numeric conversions or expression-valued blocks. Loops use <code>for</code>; interfaces are nominal. Error propagation uses prefix <code>try</code>.</p><div class="doc-links">${doc('language', 'Language reference', 'Established syntax and semantics')}${doc('grammar', 'Grammar', 'Parser-level language rules')}${doc('llm-guide', 'Guide for coding agents', 'Practical conventions and examples')}${doc('architecture', 'Compiler architecture', 'Frontend, ownership and code generation')}</div><div class="notice">The language is evolving. Consult the canonical documentation for restrictions; Rust, Go or C++ syntax is not automatically Tarn syntax.</div></div></div>`),
  ownership: () => page('LANGUAGE / OWNERSHIP', 'Keep ownership clear.', 'Memory safety comes from compile-time moves, borrows and initialization checks, without a mandatory garbage collector.', `<div class="prose"><h2>Borrow when the caller keeps ownership</h2>${block('fn show(value &string) {\n    print(value)\n}\n\nfn main() {\n    name := "Tarn"\n    show(&name)\n    print(name)\n}')}<p>A shared borrow permits reading. A mutable borrow uses <code>&mut</code> and excludes conflicting access. Lifetimes are inferred, not written as lifetime parameters.</p><h2>Move when ownership changes</h2><p>Passing a non-Copy owner by value transfers it. Reuse after a move is rejected. Copy is a semantic capability; it is not inferred from a value's byte size.</p><h2>Current boundaries</h2><p>References stored inside struct or enum fields are forbidden in v0. User-defined destructors and panic unwinding are not available. Unsafe FFI is a trusted boundary outside the complete Tarn safety proof.</p><a class="text-link" href="${source}docs/language.md">Canonical ownership rules ↗</a></div>`),
  errors: () => page('LANGUAGE / ERRORS', 'Errors you can act on.', 'Use Result and Option explicitly. Propagate recoverable errors with try and inspect compiler diagnostics as text or JSON.', `<div class="prose">${block('import "fs"\nimport "io"\n\nfn load_config() Result<string, io.Error> {\n    return fs.read_text("config.txt")\n}\n\nfn main() {\n    match load_config() {\n        Ok(text) => { print(text) }\n        Err(_) => { print("Cannot read config.txt") }\n    }\n}')}<h2>Machine-readable checking</h2>${block('tarn check --json')}<p>Diagnostics carry codes and source positions. Prefix <code>try</code> propagates a compatible error from a function returning Result or Option; it does not perform implicit error conversion.</p><div class="doc-links">${doc('errors', 'Diagnostic codes', 'Compiler errors and actionable guidance')}${doc('cli', 'CLI contracts', 'JSON output and command behavior')}</div></div>`),
  cli: () => page('TOOLCHAIN', 'One CLI.<br>A complete workflow.', 'Compile, inspect, test and manage dependencies with the integrated Tarn command. The commands below are present in the current implementation.', `<div class="prose"><div class="table-wrap"><table><thead><tr><th>Command</th><th>Purpose</th></tr></thead><tbody>${[['tarn init app', 'Create an application'], ['tarn init library --lib', 'Create a source library'], ['tarn check --json', 'Check code; machine-readable diagnostics'], ['tarn build [-o path]', 'Build a native executable'], ['tarn run', 'Build and run'], ['tarn test', 'Run tests'], ['tarn fmt', 'Format Tarn source'], ['tarn stdlib [module] --json', 'Discover embedded public APIs'], ['tarn add NAME --registry URL', 'Resolve and lock a dependency'], ['tarn fetch', 'Fetch exact locked sources'], ['tarn update [NAME]', 'Intentionally update versions'], ['tarn deps --tree', 'Explain the dependency graph'], ['tarn verify --json', 'Verify cached package integrity'], ['tarn audit --json', 'Report advisories and unknown evidence'], ['tarn publish --registry DIRECTORY', 'Publish an immutable local release']].map(([c, d]) => `<tr><td><code>${escape(c)}</code></td><td>${d}</td></tr>`).join('')}</tbody></table></div><h2>Native linking is explicit</h2>${block('tarn build --link dbus-1\ntarn run --link dbus-1')}<h2>Deliberate dependency updates</h2><p>Commit both <code>tarn.toml</code> and <code>tarn.lock</code>. Normal builds do not fetch packages, rewrite locks or execute package hooks. Use <code>fetch</code> to retrieve locked bytes and <code>update</code> to change versions.</p><div class="doc-links">${doc('cli', 'Full CLI reference', 'Flags and exit behavior')}${doc('packages', 'Package management', 'Manifest, lock and registry format')}</div><div class="notice">Registry publication currently uses a reviewed pull request. Authenticated network publishing and <code>tarn explain</code> are not implemented.</div></div>`),
  stdlib: () => page('STANDARD LIBRARY', 'Useful building blocks.', 'Discover the actual embedded API from your compiler, then follow the module guides for contracts and examples.', `<div class="prose">${block('tarn stdlib --json\ntarn stdlib collections --json')}<div class="doc-links">${[['collections', 'Collections', 'Maps, sets and sorting'], ['strings', 'Text', 'UTF-8 strings and builders'], ['filesystem', 'Filesystem', 'Owned files and directory operations'], ['console', 'Console', 'Input, output and explicit flush'], ['clocks', 'Time', 'Monotonic and wall clocks'], ['json', 'JSON', 'Owned values and explicit encoding'], ['csv', 'CSV', 'Tabular text processing'], ['http', 'HTTP', 'Server and request handling'], ['https', 'HTTPS', 'Client contracts and native dependencies'], ['ffi', 'C interoperability', 'Explicit unsafe and native linking'], ['process', 'Processes', 'Owned child completion'], ['native-tasks-report', 'Native tasks', 'Ownership and concurrency']].map(x => doc(...x)).join('')}</div><h2>Independent packages</h2><p>D-Bus is distributed as a separate package. Desktop protocols are not built into the compiler or stdlib.</p><a class="text-link" href="#packages">Explore packages →</a></div>`),
  project: () => page('PROJECT', 'Built in the open.', 'Tarn is a young systems language. Real applications guide the design, and experimental boundaries remain explicit.', `<div class="prose"><h2>What runs today</h2><p>Native programs on Linux x86_64, ownership and borrowing checks, standard-library I/O and collections, a compiler-backed LSP, source packages and machine-readable CLI operations.</p><h2>Evidence, not feature lists</h2><p>The source repository includes a CSV report CLI and status_device collector evidence. The live desktop indicator still uses a Python D-Bus adapter while the independent Tarn D-Bus package gains server support. This website does not claim the entire desktop application has been ported.</p><h2>Still experimental</h2><p>No promise of language/API stability, cross-platform support or complete native-library safety. Package signatures, public upload authentication and server D-Bus object publication remain future work.</p><div class="doc-links"><a href="https://github.com/tarn-lng/tarn">Compiler & stdlib ↗<span>Main language repository</span></a><a href="https://github.com/tarn-lng/tarn-dbus">D-Bus package ↗<span>Independent library and isolated-bus tests</span></a><a href="https://github.com/tarn-lng/registry">Registry ↗<span>Tarn validation and reviewed publication</span></a><a href="https://github.com/tarn-lng/website">Website ↗<span>This site</span></a></div><h2>Contribute</h2><p>Start with the repository's AGENTS.md and architecture notes. Report reproducible issues, preserve documented safety boundaries and accompany semantic changes with tests.</p><a class="text-link" href="https://github.com/tarn-lng/tarn/issues">Issues and discussions ↗</a></div>`),
  publish: () => page('PACKAGES / PUBLISH', 'Share source.<br>Keep releases immutable.', 'Publishing starts with a reviewed pull request. You do not need a server or an account on a separate registry service.', `<div class="prose">${block('tarn init my_library --lib\ncd my_library\n# Edit tarn.toml and your exported Tarn source\ntarn publish --registry /tmp/my-registry')}<h2>Propose a release</h2><ol><li>Test your library locally and choose a new SemVer version.</li><li>Copy generated release files into the registry’s <code>site/NAME/</code> directory.</li><li>Preserve existing releases and extend the package index.</li><li>For a new name, propose owner and catalog metadata.</li><li>Open a PR with source commit, test evidence and native-link requirements.</li></ol><p>The Tarn validator checks bytes, hashes and version inventory. It never runs the proposed package. Passing validation does not establish author identity or code safety; a maintainer reviews publication.</p><div class="notice">Published bytes cannot be replaced. Signed provenance and automated remote <code>publish</code> are not available yet.</div><a class="button secondary" href="https://github.com/tarn-lng/registry">Registry contribution guide ↗</a></div>`)
};

let generation = 0;

async function renderPackage(name, requestedVer, current) {
  content.innerHTML = `<section class="page"><a class="back-link" href="#packages">← All packages</a><div class="readme-loading"><div class="spinner"></div><p>Loading ${escape(name)}…</p></div></section>`;
  document.title = `${name} — Tarn Packages`;

  try {
    const catalog = await getCatalog();
    if (current !== generation) return;

    const releases = catalog.packages.filter(p => p.name === name);
    if (!releases.length) {
      content.innerHTML = page('PACKAGE NOT FOUND', escape(name), 'This package does not exist in the catalog.', `<a class="button secondary" href="#packages">← Back to all packages</a>`);
      return;
    }

    // Sort versions newest first
    const sortedReleases = releases.slice().reverse();
    const selected = requestedVer ? (sortedReleases.find(r => r.version === requestedVer) || sortedReleases[0]) : sortedReleases[0];
    const latestVersion = sortedReleases[0].version;

    document.title = `${selected.name} v${selected.version} — Tarn Packages`;

    const html = `
      <section class="page">
        <a class="back-link" href="#packages">← Back to all packages</a>
        <div class="package-header">
          <div class="package-header-main">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
              <span class="badge">${escape(selected.status)}</span>
              <span class="version-tag">v${escape(selected.version)}</span>
              ${selected.version === latestVersion ? '<span class="latest-pill">latest</span>' : ''}
              <span class="platform-tag">Linux x86_64</span>
            </div>
            <h1>${escape(selected.name)}</h1>
            <p class="page-intro">${escape(selected.description)}</p>
          </div>
          <div class="package-header-version">
            <label for="pkg-ver-select" class="version-label">Version:</label>
            <select id="pkg-ver-select" class="version-select">
              ${sortedReleases.map(r => `<option value="${escape(r.version)}" ${r.version === selected.version ? 'selected' : ''}>v${escape(r.version)} ${r.version === latestVersion ? '(latest)' : ''}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="package-detail-grid">
          <div class="package-main-col">
            <div class="readme-card">
              <div class="readme-header">
                <div class="readme-title">
                  <span class="readme-icon">📄</span>
                  <strong>README.md</strong>
                  <span class="readme-version-badge">v${escape(selected.version)}</span>
                </div>
                <a href="${encodeURIComponent(selected.name)}/${encodeURIComponent(selected.version)}/files/README.md" target="_blank" rel="noopener" class="readme-raw-link">Raw README ↗</a>
              </div>
              <div id="readme-body" class="readme-body">
                <div class="readme-loading">
                  <div class="spinner"></div>
                  <p>Loading README.md for v${escape(selected.version)}…</p>
                </div>
              </div>
            </div>
          </div>

          <aside class="package-sidebar">
            <div class="sidebar-box">
              <h4>Install Package</h4>
              ${block('tarn add ' + selected.name + ' --registry ' + registry + (selected.nativeLink ? '\ntarn build --link ' + selected.nativeLink : ''))}
            </div>

            <div class="sidebar-box">
              <h4>Repository</h4>
              <a class="sidebar-link" href="${escape(selected.repository)}" target="_blank" rel="noopener">${escape(selected.repository.replace(/^https:\/\/github\.com\//, ''))} ↗</a>
            </div>

            <div class="sidebar-box">
              <h4>Metadata</h4>
              <ul class="meta-list">
                <li><span>Version</span><strong>v${escape(selected.version)}</strong></li>
                <li><span>Dependencies</span><strong>${selected.dependencies} direct</strong></li>
                <li><span>Platform</span><strong>Linux x86_64</strong></li>
                ${selected.nativeLink ? `<li><span>Native Link</span><strong><code>${escape(selected.nativeLink)}</code></strong></li>` : ''}
                <li><span>Release Record</span><a class="text-link" href="${registry}${encodeURIComponent(selected.name)}/${encodeURIComponent(selected.version)}/release.json" target="_blank">release.json ↗</a></li>
              </ul>
            </div>

            <div class="sidebar-box">
              <h4>Integrity SHA-256</h4>
              <div class="hash-box">
                <code>${escape(selected.hash)}</code>
                <button class="copy small" type="button" aria-label="Copy hash">Copy</button>
              </div>
            </div>

            <div class="sidebar-box">
              <h4>Published Versions (${sortedReleases.length})</h4>
              <div class="versions-history">
                ${sortedReleases.map(r => `
                  <a href="#package/${encodeURIComponent(r.name)}/${encodeURIComponent(r.version)}" class="version-row ${r.version === selected.version ? 'current' : ''}">
                    <span class="v-num">v${escape(r.version)}</span>
                    ${r.version === latestVersion ? '<span class="v-tag">latest</span>' : ''}
                  </a>
                `).join('')}
              </div>
            </div>
          </aside>
        </div>
      </section>
    `;

    content.innerHTML = html;

    const selectEl = document.querySelector('#pkg-ver-select');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        location.hash = `#package/${encodeURIComponent(selected.name)}/${encodeURIComponent(e.target.value)}`;
      });
    }

    // Fetch and render README.md
    const readmeUrl = `${encodeURIComponent(selected.name)}/${encodeURIComponent(selected.version)}/files/README.md`;
    try {
      const resp = await fetch(readmeUrl);
      if (!resp.ok) throw new Error('README not available');
      const mdText = await resp.text();
      const readmeEl = document.querySelector('#readme-body');
      if (readmeEl && current === generation) {
        readmeEl.innerHTML = renderMarkdown(mdText);
      }
    } catch (err) {
      const readmeEl = document.querySelector('#readme-body');
      if (readmeEl && current === generation) {
        readmeEl.innerHTML = `
          <div class="notice">
            <p><strong>README.md could not be loaded</strong></p>
            <p>Visit the source repository to read the documentation: <a href="${escape(selected.repository)}" target="_blank" rel="noopener">${escape(selected.repository)} ↗</a></p>
          </div>
        `;
      }
    }

  } catch (err) {
    if (current === generation) {
      content.innerHTML = page('ERROR', 'Catalog unavailable', 'Could not load package details.', `<a class="button secondary" href="#packages">← Back to all packages</a>`);
    }
  }
}

async function render() {
  const current = ++generation;
  const hash = location.hash.slice(1) || 'home';
  const route = hash;

  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.hash === location.hash || (a.hash === '#packages' && (route === 'packages' || route.startsWith('package/') || route.startsWith('packages/')))));

  if (route === 'home') {
    content.replaceChildren(document.querySelector('#home').content.cloneNode(true));
    document.title = 'Tarn — Native code. Clear intent.';
  } else if (route.startsWith('package/') || route.startsWith('packages/')) {
    const parts = route.replace(/^packages?\//, '').split('/');
    const pkgName = decodeURIComponent(parts[0]);
    const requestedVer = parts[1] ? decodeURIComponent(parts[1]) : null;
    await renderPackage(pkgName, requestedVer, current);
  } else if (route === 'packages') {
    document.title = 'Packages — Tarn';
    content.innerHTML = page('PACKAGE REGISTRY', 'Small packages.<br>Real capabilities.', 'Immutable Tarn source packages. Click any package to view its documentation, README, and usage examples.', `<a class="text-link" href="#publish">Publish a package →</a><br><input class="search" type="search" aria-label="Search packages" placeholder="Search by name, description or native library…"><p class="muted" id="catalog-status" role="status">Loading catalog…</p><div class="catalog"></div><div class="notice">Integrity is verified against hashes. Publisher provenance is currently unknown; experimental packages require review.</div>`);

    try {
      const data = await getCatalog();
      if (current !== generation) return;
      const packages = data.packages;

      const show = query => {
        const q = query.toLowerCase();
        const filtered = packages.filter(p => (p.name + ' ' + p.description + ' ' + (p.nativeLink || '')).toLowerCase().includes(q));

        // Group by package name so the list shows unique packages
        const byName = new Map();
        for (const p of filtered) {
          if (!byName.has(p.name)) byName.set(p.name, []);
          byName.get(p.name).push(p);
        }

        document.querySelector('#catalog-status').textContent = `${byName.size} package${byName.size === 1 ? '' : 's'} (${filtered.length} total release${filtered.length === 1 ? '' : 's'}) · Generated by ${data.generator}`;

        const cards = [];
        for (const [name, releases] of byName) {
          const latest = releases[releases.length - 1];
          const versionsCount = releases.length;
          const versionsNote = versionsCount > 1 ? ` · ${versionsCount} versions` : '';

          cards.push(`
            <article class="package">
              <div class="package-card-header">
                <span class="badge">${escape(latest.status)}</span>
                <span class="version">v${escape(latest.version)}${versionsNote}</span>
              </div>
              <a href="#package/${encodeURIComponent(latest.name)}" class="package-title-link" aria-label="View ${escape(latest.name)} README and details">
                <h3>${escape(latest.name)}</h3>
              </a>
              <p>${escape(latest.description)}</p>
              ${block('tarn add ' + latest.name + ' --registry ' + registry + (latest.nativeLink ? '\ntarn build --link ' + latest.nativeLink : ''))}
              <div class="package-card-footer">
                <span class="package-card-meta">Linux x86_64 · ${latest.dependencies} deps</span>
                <a class="button secondary small" href="#package/${encodeURIComponent(latest.name)}">Readme & Docs →</a>
              </div>
            </article>
          `);
        }

        document.querySelector('.catalog').innerHTML = cards.length ? cards.join('') : '<p class="empty">No packages match your search.</p>';
      };

      show('');
      const searchEl = document.querySelector('.search');
      if (searchEl) {
        searchEl.addEventListener('input', e => show(e.target.value));
      }
    } catch (e) {
      if (current === generation) {
        document.querySelector('#catalog-status').textContent = 'Could not load the catalog. Reload or visit the registry repository.';
      }
    }
  } else {
    content.innerHTML = (pages[route] || pages.project)();
    document.title = `${route[0].toUpperCase() + route.slice(1)} — Tarn`;
  }
  window.scrollTo(0, 0);
}

document.addEventListener('click', async e => {
  if (!e.target.matches('.copy')) return;
  const button = e.target;
  try {
    const codeEl = button.parentElement.querySelector('code');
    if (!codeEl) return;
    await navigator.clipboard.writeText(codeEl.textContent);
    const orig = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = orig; }, 1600);
  } catch {
    button.textContent = 'Select text';
  }
});

window.addEventListener('hashchange', render);
render();
