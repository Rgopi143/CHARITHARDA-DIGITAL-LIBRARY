// Minimal client app: uploads, persistence, list, tabs, OCR image match
(function() {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const tabUpload = $('#tab-upload');
  const tabDocs = $('#tab-docs');
  const viewUpload = $('#view-upload');
  const viewDocs = $('#view-docs');
  const dropzone = $('#dropzone');
  const fileInput = $('#file-input');
  const docsList = $('#docs-list');
  const emptyState = $('#empty-state');
  const btnClear = $('#btn-clear');
  const addMore = $('#add-more');
  const checkImage = $('#check-image');
  const matchResult = $('#match-result');
  const searchInput = $('#search-docs');

  let currentQuery = '';
  let emptyDefaultHTML = null;

  const STORAGE_KEY = 'mdl:docs';

  function loadDocs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveDocs(docs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }

  function humanSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    const units = ['KB','MB','GB'];
    let size = bytes / 1024;
    let unitIdx = 0;
    while (size >= 1024 && unitIdx < units.length - 1) { size /= 1024; unitIdx++; }
    return size.toFixed(1) + ' ' + units[unitIdx];
  }

  function renderList() {
    const docs = loadDocs();
    docsList.innerHTML = '';
    if (emptyDefaultHTML == null) emptyDefaultHTML = emptyState.innerHTML;
    if (!docs.length) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';
    const q = (currentQuery || '').toLowerCase().trim();
    const scored = docs.map((d, idx) => {
      const name = (d.name || '').toLowerCase();
      let score = 0;
      if (q) {
        if (name.includes(q)) score += Math.min(q.length, 10);
        if (name.startsWith(q)) score += 5;
        // boost for matching token-wise
        const tokens = q.split(/\s+/).filter(Boolean);
        tokens.forEach(t => { if (t.length > 1 && name.includes(t)) score += Math.min(t.length, 8); });
      }
      return { d, idx, score };
    }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score; // matched first
      return a.d.name.localeCompare(b.d.name);
    });

    const visible = q ? scored.filter(x => x.score > 0) : scored;

    if (visible.length === 0) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = 'No matching documents.';
      return;
    } else {
      emptyState.style.display = 'none';
      // restore default message for the next time it's needed
      if (q === '' && emptyDefaultHTML != null) emptyState.innerHTML = emptyDefaultHTML;
    }

    visible.forEach(({ d, idx, score }) => {
      const li = document.createElement('li');
      li.className = 'doc-card';
      if (q && score > 0) li.setAttribute('data-match', 'true');
      li.innerHTML = `
        <div class="doc-row">
          <div class="doc-icon">📄</div>
          <div class="doc-name" title="${d.name}">${d.name}</div>
        </div>
        <div class="doc-meta">
          <span>${humanSize(d.size || 0)}</span>
          <span>${d.type || 'unknown'}</span>
        </div>
        <div class="doc-actions">
          <button class="btn subtle" data-action="remove" data-idx="${idx}">Remove</button>
        </div>
      `;
      docsList.appendChild(li);
    });
  }

  function addFiles(files) {
    if (!files || !files.length) return;
    const docs = loadDocs();
    Array.from(files).forEach(f => {
      docs.push({ name: f.name, size: f.size, type: f.type });
    });
    saveDocs(docs);
    renderList();
  }

  function removeDocAt(index) {
    const docs = loadDocs();
    docs.splice(index, 1);
    saveDocs(docs);
    renderList();
  }

  function setActiveTab(which) {
    if (which === 'upload') {
      tabUpload.classList.add('active');
      tabUpload.setAttribute('aria-selected', 'true');
      tabDocs.classList.remove('active');
      tabDocs.setAttribute('aria-selected', 'false');
      viewUpload.classList.add('active');
      viewDocs.classList.remove('active');
    } else {
      tabDocs.classList.add('active');
      tabDocs.setAttribute('aria-selected', 'true');
      tabUpload.classList.remove('active');
      tabUpload.setAttribute('aria-selected', 'false');
      viewDocs.classList.add('active');
      viewUpload.classList.remove('active');
    }
  }

  // Drag & drop
  ;['dragenter','dragover'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ;['dragleave','drop'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', (e) => {
    addFiles(e.dataTransfer.files);
  });
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => addFiles(e.target.files));

  // Tabs
  tabUpload.addEventListener('click', () => setActiveTab('upload'));
  tabDocs.addEventListener('click', () => { renderList(); setActiveTab('docs'); });

  // Clear
  btnClear.addEventListener('click', () => {
    if (!confirm('Clear all documents?')) return;
    saveDocs([]);
    renderList();
  });

  // Add more in docs
  addMore.addEventListener('change', (e) => addFiles(e.target.files));

  // Remove handling
  docsList.addEventListener('click', (e) => {
    const target = e.target;
    if (target.matches('button[data-action="remove"]')) {
      const idx = parseInt(target.getAttribute('data-idx'), 10);
      removeDocAt(idx);
    }
  });

  // OCR image recognition: extract text and try to match to file names
  async function recognizeAndMatch(file) {
    if (!matchResult) return;
    matchResult.style.display = 'block';
    matchResult.textContent = 'Recognizing text... (this may take a moment)';
    try {
      if (!(window && window.Tesseract)) {
        matchResult.textContent = 'Text recognition is unavailable.';
        return;
      }
      const worker = await Tesseract.createWorker('eng');
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const text = (data && data.text ? data.text : '').trim();
      if (!text) {
        matchResult.textContent = 'No text detected in the image.';
        return;
      }
      const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const blob = lines.join(' ').toLowerCase();

      const docs = loadDocs();
      // Simple similarity: check if file name tokens appear in OCR blob
      let best = { score: 0, idx: -1 };
      docs.forEach((d, idx) => {
        const base = d.name.toLowerCase();
        const tokens = base.split(/[^a-z0-9]+/).filter(Boolean);
        let score = 0;
        tokens.forEach(t => { if (t.length > 2 && blob.includes(t)) score += t.length; });
        if (score > best.score) best = { score, idx };
      });

      if (best.idx >= 0 && best.score >= 5) {
        matchResult.innerHTML = `Likely match: <strong>${docs[best.idx].name}</strong> (score ${best.score})`;
      } else {
        matchResult.textContent = 'No strong match found against your documents.';
      }
    } catch (err) {
      matchResult.textContent = 'Error recognizing image: ' + (err && err.message ? err.message : String(err));
    }
  }

  if (checkImage) {
    checkImage.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      recognizeAndMatch(file);
    });
  }

  // Live search: prioritize matching filenames to appear at the top
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentQuery = e.target.value || '';
      renderList();
    });
  }

  // Initial
  renderList();
})();

(function() {
  "use strict";

  /** State */
  const storageKey = "mdl.files.v1";
  /** @type {Array<{id:string,name:string,size:number,type:string,date:number,blobUrl?:string}>} */
  let documents = [];

  /** Elements */
  const tabUpload = document.getElementById("tab-upload");
  const tabDocs = document.getElementById("tab-docs");
  const viewUpload = document.getElementById("view-upload");
  const viewDocs = document.getElementById("view-docs");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const docsList = document.getElementById("docs-list");
  const emptyState = document.getElementById("empty-state");
  const btnClear = document.getElementById("btn-clear");
  const addMore = document.getElementById("add-more");

  /** Utilities */
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const formatSize = (bytes) => {
    const units = ["B","KB","MB","GB"]; let i = 0; let n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  };
  const formatDate = (ms) => new Date(ms).toLocaleString();

  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      documents = raw ? JSON.parse(raw) : [];
    } catch {
      documents = [];
    }
  }

  function save() {
    try {
      const toPersist = documents.map(({ id, name, size, type, date }) => ({ id, name, size, type, date }));
      localStorage.setItem(storageKey, JSON.stringify(toPersist));
    } catch (e) {
      console.error("Failed to persist documents", e);
    }
  }

  function switchTab(target) {
    const isUpload = target === "upload";
    tabUpload.classList.toggle("active", isUpload);
    tabUpload.setAttribute("aria-selected", String(isUpload));
    tabDocs.classList.toggle("active", !isUpload);
    tabDocs.setAttribute("aria-selected", String(!isUpload));
    viewUpload.classList.toggle("active", isUpload);
    viewDocs.classList.toggle("active", !isUpload);
  }

  function renderList() {
    docsList.innerHTML = "";
    if (!documents.length) {
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    for (const doc of documents) {
      const li = document.createElement("li");
      li.className = "doc-card";

      const top = document.createElement("div");
      top.className = "doc-row";

      const icon = document.createElement("div");
      icon.className = "doc-icon";
      icon.textContent = fileEmoji(doc.type, doc.name);

      const name = document.createElement("div");
      name.className = "doc-name";
      name.title = doc.name;
      name.textContent = doc.name;

      top.appendChild(icon);
      top.appendChild(name);

      const meta = document.createElement("div");
      meta.className = "doc-meta";
      meta.innerHTML = `<span>${formatSize(doc.size)}</span><span>•</span><span>${formatDate(doc.date)}</span>`;

      const actions = document.createElement("div");
      actions.className = "doc-actions";

      const btnDownload = document.createElement("button");
      btnDownload.className = "btn subtle";
      btnDownload.textContent = "Download";
      btnDownload.addEventListener("click", () => handleDownload(doc));

      const btnRemove = document.createElement("button");
      btnRemove.className = "btn subtle";
      btnRemove.textContent = "Remove";
      btnRemove.addEventListener("click", () => removeDoc(doc.id));

      actions.appendChild(btnDownload);
      actions.appendChild(btnRemove);

      li.appendChild(top);
      li.appendChild(meta);
      li.appendChild(actions);
      docsList.appendChild(li);
    }
  }

  function fileEmoji(mime, name) {
    const ext = (name.split(".").pop() || "").toLowerCase();
    if (mime.startsWith("image/") || ["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return "🖼️";
    if (mime.startsWith("video/") || ["mp4","mkv","mov","webm"].includes(ext)) return "🎞️";
    if (mime.startsWith("audio/") || ["mp3","wav","m4a","flac"].includes(ext)) return "🎵";
    if (["pdf"].includes(ext)) return "📄";
    if (["zip","rar","7z","tar","gz"].includes(ext)) return "🗜️";
    if (["doc","docx"].includes(ext)) return "📝";
    if (["xls","xlsx","csv"].includes(ext)) return "📊";
    if (["ppt","pptx"].includes(ext)) return "📈";
    return "📎";
  }

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const newDocs = files.map(f => ({ id: uid(), name: f.name, size: f.size, type: f.type || "application/octet-stream", date: Date.now() }));
    documents = [...newDocs, ...documents];
    save();
    renderList();
    switchTab("docs");
  }

  function handleDownload(doc) {
    // This stores in-memory Blob URLs for current session only. Files are not saved persistently in the browser due to storage constraints.
    if (!doc.blobUrl) {
      // We cannot reconstruct original File blobs from localStorage; prompt user to re-add for actual content. Here we create a placeholder text file with metadata.
      const placeholder = new Blob([
        `My Digital Library\n\n`+
        `File: ${doc.name}\n`+
        `Type: ${doc.type}\n`+
        `Size: ${formatSize(doc.size)}\n`+
        `Added: ${formatDate(doc.date)}\n\n`+
        `Note: Browser storage persists metadata only. Re-upload to restore the original file content.`
      ], { type: "text/plain" });
      doc.blobUrl = URL.createObjectURL(placeholder);
    }

    const a = document.createElement("a");
    a.href = doc.blobUrl;
    a.download = doc.name.endsWith('.txt') ? doc.name : `${doc.name}.info.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function removeDoc(id) {
    documents = documents.filter(d => d.id !== id);
    save();
    renderList();
  }

  function clearAll() {
    documents = [];
    save();
    renderList();
  }

  // Events
  tabUpload.addEventListener("click", () => switchTab("upload"));
  tabDocs.addEventListener("click", () => switchTab("docs"));

  ;[fileInput, addMore].forEach(input => {
    input.addEventListener("change", (e) => handleFiles(e.target.files));
  });

  ["dragenter","dragover"].forEach(ev => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add("dragover");
  }));
  ["dragleave","drop"].forEach(ev => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    if (ev === "drop") handleFiles(e.dataTransfer.files);
    dropzone.classList.remove("dragover");
  }));
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });

  btnClear.addEventListener("click", clearAll);

  // Init
  load();
  renderList();
})();


