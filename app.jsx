const STORAGE_KEY = 'mdl:docs';
const API_BASE = 'http://localhost:3001/api';
const IDB_NAME = 'mdlBlobs.v1';
const IDB_STORE = 'files';
// Google Drive Picker config (replace with your credentials)
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

function loadDocs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveDocs(docs) {
  const toPersist = (docs || []).map(d => ({ id: d.id, name: d.name, size: d.size, type: d.type }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
}
function humanSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return bytes + ' B';
  const units = ['KB','MB','GB'];
  let size = bytes / 1024; let i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return size.toFixed(1) + ' ' + units[i];
}

function useLocalStorageDocs() {
  const [docs, setDocs] = React.useState(loadDocs);
  React.useEffect(() => { saveDocs(docs); }, [docs]);
  return [docs, setDocs];
}

function Tabs({ active, onChange }) {
  return (
    <nav className="tabs" role="tablist">
      <button id="tab-upload" className={`tab ${active==='upload'?'active':''}`} role="tab" aria-selected={active==='upload'} onClick={() => onChange('upload')}>Upload</button>
      <button id="tab-docs" className={`tab ${active==='docs'?'active':''}`} role="tab" aria-selected={active==='docs'} onClick={() => onChange('docs')}>My Documents</button>
    </nav>
  );
}

function Dropzone({ onFiles, disabled }) {
  const inputRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);
  const onDrop = React.useCallback((e) => {
    if (disabled) return; 
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer && e.dataTransfer.files) onFiles(e.dataTransfer.files);
  }, [onFiles, disabled]);
  return (
    <div className={`dropzone ${drag?'dragover':''} ${disabled?'is-disabled':''}`} tabIndex={0}
      onDragEnter={(e)=>{ if (disabled) return; e.preventDefault(); setDrag(true); }}
      onDragOver={(e)=>{ if (disabled) return; e.preventDefault(); setDrag(true); }}
      onDragLeave={(e)=>{ if (disabled) return; e.preventDefault(); setDrag(false); }}
      onDrop={onDrop}
      onClick={()=> { if (disabled) return; if (inputRef.current) inputRef.current.click(); }}
      aria-label="Drop files here or click to upload">
      <div className="dropzone-inner">
        <div className="drop-illustration">
          <div className="ring ring-1"></div>
          <div className="ring ring-2"></div>
          <div className="ring ring-3"></div>
          <div className="icon" title="Charithardha">🐧</div>
        </div>
        <h2>Drop your files here</h2>
        <p>or click to browse. We keep the same page and vibe ✨</p>
        <input ref={inputRef} type="file" multiple aria-hidden="true" disabled={disabled} style={{position:'absolute', inset:0, opacity:0}} onChange={(e)=> onFiles(e.target.files)} />
      </div>
    </div>
  );
}

function DocsList({ docs, onRemove, onOpen, onDownload }) {
  const iconFor = React.useCallback((name, type) => {
    const lower = (name || '').toLowerCase();
    if (type && type.startsWith('image/')) return '🖼️';
    if (type && type.startsWith('video/')) return '🎬';
    if (type && type.startsWith('audio/')) return '🎵';
    if (type && (type.includes('pdf') || lower.endsWith('.pdf'))) return '📕';
    if (lower.match(/\.(docx?|rtf)$/)) return '📝';
    if (lower.match(/\.(xlsx?|csv)$/)) return '📊';
    if (lower.match(/\.(pptx?|key)$/)) return '📈';
    if (lower.match(/\.(zip|rar|7z|tar|gz)$/)) return '🗜️';
    if (lower.match(/\.(txt|md|log)$/)) return '📄';
    if (lower.match(/\.(html?|css|js|ts|json|yml|xml|py|java|c|cpp|cs|rb|go)$/)) return '💻';
    return '📄';
  }, []);
  const groupFor = React.useCallback((name, type) => {
    const lower = (name || '').toLowerCase();
    if (type && type.startsWith('image/')) return 'Images';
    if (type && type.startsWith('video/')) return 'Videos';
    if (type && type.startsWith('audio/')) return 'Audio';
    if (type && (type.includes('pdf') || lower.endsWith('.pdf'))) return 'PDF';
    if (lower.match(/\.(docx?|rtf)$/)) return 'Word';
    if (lower.match(/\.(xlsx?|csv)$/)) return 'Excel & CSV';
    if (lower.match(/\.(pptx?|key)$/)) return 'Slides';
    if (lower.match(/\.(zip|rar|7z|tar|gz)$/)) return 'Archives';
    if (lower.match(/\.(txt|md|log)$/)) return 'Text';
    if (lower.match(/\.(html?|css|js|ts|json|yml|xml|py|java|c|cpp|cs|rb|go)$/)) return 'Code';
    return 'Other';
  }, []);

  const groups = React.useMemo(() => {
    const map = new Map();
    docs.forEach((d, idx) => {
      const g = groupFor(d.name, d.type);
      if (!map.has(g)) map.set(g, []);
      map.get(g).push({ d, idx });
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [docs, groupFor]);

  return (
    <div aria-live="polite">
      {groups.map(([groupName, items]) => (
        <section key={groupName} className="doc-group" aria-label={groupName} style={{marginBottom:'10px'}}>
          <h3 style={{margin:'8px 2px 6px', fontSize:'14px', color:'#a9b3c9', fontWeight:600}}>{groupName} ({items.length})</h3>
          <ul className="docs-list">
            {items.map(({ d, idx }) => (
              <li key={idx} className="doc-card" role="button" tabIndex={0} onClick={() => onOpen(d)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(d); } }}>
                <div className="doc-row">
                  <div className="doc-icon">{iconFor(d.name, d.type)}</div>
                  <div className="doc-name" title={d.name}>{d.name}</div>
                </div>
                <div className="doc-meta">
                  <span>{humanSize(d.size || 0)}</span>
                  <span>{d.type || 'unknown'}</span>
                </div>
                <div className="doc-actions">
                  <button className="btn subtle" onClick={(e) => { e.stopPropagation(); onDownload(d); }}>Download</button>
                  <button className="btn subtle" onClick={(e) => { e.stopPropagation(); onRemove(idx); }}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PreviewContent({ url, type, name }) {
  const lower = (name || '').toLowerCase();
  const isImage = (type && type.startsWith('image/')) || lower.match(/\.(png|jpe?g|gif|webp|svg)$/);
  const isVideo = (type && type.startsWith('video/')) || lower.match(/\.(mp4|webm|mov|mkv)$/);
  const isAudio = (type && type.startsWith('audio/')) || lower.match(/\.(mp3|wav|m4a|flac)$/);
  const isPdf = lower.endsWith('.pdf') || (type && type.includes('pdf'));

  if (isImage) {
    return <img src={url} alt={name} style={{maxWidth:'100%', maxHeight:'70vh', display:'block', margin:'0 auto'}} />;
  }
  if (isVideo) {
    return <video src={url} controls style={{width:'100%', maxHeight:'70vh'}} />;
  }
  if (isAudio) {
    return <audio src={url} controls style={{width:'100%'}} />;
  }
  if (isPdf) {
    return <iframe title={name} src={url} style={{width:'100%', height:'70vh', border:0}} />;
  }
  return (
    <div style={{textAlign:'center'}}>
      <p>Preview not supported for this file type.</p>
      <a className="btn primary" href={url} download target="_blank" rel="noopener noreferrer">Download</a>
    </div>
  );
}

function App() {
  const [active, setActive] = React.useState('upload');
  const [docs, setDocs] = useLocalStorageDocs();
  const [query, setQuery] = React.useState('');
  const [preview, setPreview] = React.useState(null);
  const [driveLink, setDriveLink] = React.useState('');

  // --- IndexedDB helpers for Blob persistence across refreshes ---
  const openDB = React.useCallback(() => new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }), []);

  const idbPut = React.useCallback(async (id, blob) => {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(blob, id);
      tx.oncomplete = () => { db.close(); res(); };
      tx.onerror = () => { db.close(); rej(tx.error); };
    });
  }, [openDB]);

  const idbGet = React.useCallback(async (id) => {
    const db = await openDB();
    return await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = () => { const v = req.result; db.close(); res(v || null); };
      req.onerror = () => { const err = req.error; db.close(); rej(err); };
    });
  }, [openDB]);

  const idbDel = React.useCallback(async (id) => {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => { db.close(); res(); };
      tx.onerror = () => { db.close(); rej(tx.error); };
    });
  }, [openDB]);

  const idbClear = React.useCallback(async () => {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => { db.close(); res(); };
      tx.onerror = () => { db.close(); rej(tx.error); };
    });
  }, [openDB]);

  const onFiles = React.useCallback(async (files) => {
    if (!files || !files.length) return;
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('file', f));
    const resp = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd });
    if (!resp.ok) { alert('Upload failed'); return; }
    const data = await resp.json();
    const created = (data.uploaded || []).map(u => ({ id: u.id, name: u.name, size: u.size, type: u.type }));
    setDocs(prev => [...created, ...prev]);
  }, [setDocs]);

  const onRemove = React.useCallback(async (idx) => {
    setDocs(prev => prev);
    const doc = docs[idx];
    if (!doc) return;
    await fetch(`${API_BASE}/docs/${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
    setDocs(prev => prev.filter((_, i) => i !== idx));
  }, [docs, setDocs]);

  const onClear = React.useCallback(() => {
    if (!confirm('Clear all documents?')) return;
    // No bulk delete endpoint; rely on local clear for UI only
    setDocs([]);
  }, [setDocs]);

  const onOpen = React.useCallback((doc) => {
    try {
      const url = `${API_BASE}/docs/${encodeURIComponent(doc.id)}/download`;
      setPreview({ name: doc.name, type: doc.type, url });
    } catch (e) {
      alert('Unable to open this document.');
    }
  }, []);

  const onDownload = React.useCallback((doc) => {
    try {
      const url = `${API_BASE}/docs/${encodeURIComponent(doc.id)}/download?download=1`;
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Unable to download this document.');
    }
  }, []);

  React.useEffect(() => {
    if (!preview) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preview]);

  // Load list from API on entering Docs tab, and initially
  React.useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`${API_BASE}/docs`);
        if (!resp.ok) return;
        const items = await resp.json();
        setDocs(items);
      } catch {}
    };
    load();
  }, [setDocs]);

  // --- Google Drive import ---
  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = resolve; s.onerror = reject; document.body.appendChild(s);
  });

  const ensureGoogleApis = React.useCallback(async () => {
    await loadScript('https://apis.google.com/js/api.js');
    await loadScript('https://accounts.google.com/gsi/client');
    await new Promise((res) => window.gapi ? res() : (window.addEventListener('gapiLoaded', res)));
  }, []);

  const importFromDrive = React.useCallback(async () => {
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY.startsWith('YOUR_') || !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_')) {
      alert('Configure Google API Key and Client ID in app.jsx to use Drive import.');
      return;
    }
    try {
      await ensureGoogleApis();
      await new Promise((resolve) => window.gapi.load('picker', { callback: resolve }));

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: () => {}
      });
      const accessToken = await new Promise((resolve, reject) => {
        tokenClient.requestAccessToken({ prompt: 'consent', hint: '' });
        const check = setInterval(() => {
          const t = window.gapi && window.gapi.client && window.gapi.client.getToken && window.gapi.client.getToken();
          if (t && t.access_token) { clearInterval(check); resolve(t.access_token); }
        }, 200);
        setTimeout(() => { clearInterval(check); reject(new Error('Token timeout')); }, 10000);
      });

      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false);
      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setOAuthToken(accessToken)
        .setCallback(async (data) => {
          if (data.action !== window.google.picker.Action.PICKED) return;
          const picked = data.docs || [];
          if (!picked.length) return;
          const fd = new FormData();
          for (const doc of picked) {
            const fileId = doc.id; const name = doc.name; const mime = doc.mimeType;
            const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!resp.ok) continue;
            const blob = await resp.blob();
            const file = new File([blob], name, { type: mime || blob.type || 'application/octet-stream' });
            fd.append('file', file);
          }
          if ([...fd.keys()].length === 0) return;
          const uploadResp = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd });
          if (!uploadResp.ok) { alert('Import failed'); return; }
          const data2 = await uploadResp.json();
          const created = (data2.uploaded || []).map(u => ({ id: u.id, name: u.name, size: u.size, type: u.type }));
          setDocs(prev => [...created, ...prev]);
          setActive('docs');
        })
        .setTitle('Select files from Google Drive')
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .build();
      picker.setVisible(true);
    } catch (e) {
      alert('Unable to import from Drive.');
    }
  }, [setDocs, setActive, ensureGoogleApis]);

  const parseDriveFileId = (link) => {
    if (!link) return null;
    try {
      // Handles links like https://drive.google.com/file/d/FILE_ID/view?usp=...
      // or https://drive.google.com/open?id=FILE_ID or https://drive.google.com/uc?id=FILE_ID
      const url = new URL(link);
      const idParam = url.searchParams.get('id');
      if (idParam) return idParam;
      const parts = url.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('d');
      if (idx >= 0 && parts[idx+1]) return parts[idx+1];
      return null;
    } catch { return null; }
  };

  const importDriveLink = React.useCallback(async () => {
    const fileId = parseDriveFileId(driveLink.trim());
    if (!fileId) { alert('Invalid Google Drive link.'); return; }
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY.startsWith('YOUR_') || !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_')) {
      alert('Configure Google API Key and Client ID in app.jsx to use Drive import.');
      return;
    }
    try {
      await ensureGoogleApis();
      await new Promise((resolve) => window.gapi.load('picker', { callback: resolve }));
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: () => {}
      });
      const accessToken = await new Promise((resolve, reject) => {
        tokenClient.requestAccessToken({ prompt: 'consent' });
        const check = setInterval(() => {
          const t = window.gapi && window.gapi.client && window.gapi.client.getToken && window.gapi.client.getToken();
          if (t && t.access_token) { clearInterval(check); resolve(t.access_token); }
        }, 200);
        setTimeout(() => { clearInterval(check); reject(new Error('Token timeout')); }, 10000);
      });
      const metaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!metaResp.ok) { alert('Cannot access this Drive file.'); return; }
      const meta = await metaResp.json();
      const mediaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!mediaResp.ok) { alert('Failed to download file from Drive.'); return; }
      const blob = await mediaResp.blob();
      const file = new File([blob], meta.name || 'drive-file', { type: meta.mimeType || blob.type || 'application/octet-stream' });
      const fd = new FormData();
      fd.append('file', file);
      const uploadResp = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd });
      if (!uploadResp.ok) { alert('Import failed'); return; }
      const data2 = await uploadResp.json();
      const created = (data2.uploaded || []).map(u => ({ id: u.id, name: u.name, size: u.size, type: u.type }));
      setDocs(prev => [...created, ...prev]);
      setDriveLink('');
      setActive('docs');
    } catch (e) {
      alert('Unable to import from Drive link.');
    }
  }, [driveLink, setDocs, setActive, ensureGoogleApis]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(d => (d.name || '').toLowerCase().includes(q));
  }, [docs, query]);

  return (
    <main className="container">
      <header className="app-header">
        <div className="brand">
          <div className="logo">📚</div>
          <h1>My Digital Library</h1>
        </div>
        <Tabs active={active} onChange={(t)=>{ setActive(t); if (t==='docs') {/* refresh if needed */} }} />
      </header>

      {active === 'upload' && (
        <section id="view-upload" className="view active" aria-labelledby="tab-upload">
          <div className="panel glass">
            <Dropzone onFiles={onFiles} />
            <div id="upload-hint" className="hint">Accepted: Any file. Your list appears right after drop.</div>
          </div>
        </section>
      )}

      {active === 'docs' && (
        <section id="view-docs" className="view active" aria-labelledby="tab-docs">
          <div className="panel glass">
            <div className="panel-header">
              <h2>My Documents</h2>
              <div className="actions">
                <input id="search-docs" type="search" className="btn subtle" placeholder="Search documents..." style={{minWidth:'180px', marginRight:'8px'}} aria-label="Search documents" value={query} onChange={(e)=> setQuery(e.target.value)} />
                <button id="btn-clear" className="btn subtle" title="Clear all documents" onClick={onClear}>Clear All</button>
                <label className="btn primary">
                  <input id="add-more" type="file" multiple onChange={(e)=> onFiles(e.target.files)} />
                  Add More
                </label>
                <a className="btn primary" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener noreferrer" title="Open Google Drive">Google Drive</a>
              </div>
            </div>
            <div style={{display:'flex', gap:'8px', margin:'10px 0'}}>
              <input type="url" placeholder="Paste Google Drive link (from email)" value={driveLink} onChange={(e)=> setDriveLink(e.target.value)} className="btn subtle" style={{flex:1}} />
              <button className="btn subtle" onClick={importDriveLink} disabled={!driveLink.trim()}>Import Link</button>
            </div>
            {filtered.length === 0 ? (
              <div id="empty-state" className="empty">
                <div className="empty-art">🗂️</div>
                <p>{docs.length ? 'No matching documents.' : 'No documents yet. Drag and drop some files on the Upload tab.'}</p>
              </div>
            ) : (
              <DocsList docs={filtered} onRemove={onRemove} onOpen={onOpen} onDownload={onDownload} />
            )}
          </div>
        </section>
      )}

      {preview && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`} onClick={() => setPreview(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" title={preview.name}>{preview.name}</div>
              <button className="btn subtle" onClick={() => setPreview(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex', justifyContent:'flex-end', gap:'8px', marginBottom:'8px'}}>
                {preview.url && (
                  <a className="btn subtle" href={preview.url} download={preview.name}>Download</a>
                )}
              </div>
              <PreviewContent url={preview.url} type={preview.type} name={preview.name} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

 


