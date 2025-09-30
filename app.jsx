const STORAGE_KEY = 'mdl:docs';

function loadDocs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveDocs(docs) {
  const toPersist = (docs || []).map(d => ({ name: d.name, size: d.size, type: d.type }));
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

function DocsList({ docs, onRemove, onOpen }) {
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
              <li key={idx} className="doc-card">
                <div className="doc-row" role="button" tabIndex={0} onClick={() => onOpen(d)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(d); } }}>
                  <div className="doc-icon">{iconFor(d.name, d.type)}</div>
                  <div className="doc-name" title={d.name}>{d.name}</div>
                </div>
                <div className="doc-meta">
                  <span>{humanSize(d.size || 0)}</span>
                  <span>{d.type || 'unknown'}</span>
                </div>
                <div className="doc-actions">
                  <button className="btn subtle" onClick={() => onRemove(idx)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function App() {
  const [active, setActive] = React.useState('upload');
  const [docs, setDocs] = useLocalStorageDocs();
  const [query, setQuery] = React.useState('');
  const [uploadLocked, setUploadLocked] = React.useState(false);

  const onFiles = React.useCallback((files) => {
    if (!files || !files.length) return;
    const arr = Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type, blobUrl: URL.createObjectURL(f) }));
    setDocs(prev => [...prev, ...arr]);
    setUploadLocked(true);
  }, [setDocs]);

  const onRemove = React.useCallback((idx) => {
    setDocs(prev => prev.filter((_, i) => i !== idx));
  }, [setDocs]);

  const onClear = React.useCallback(() => {
    if (!confirm('Clear all documents?')) return;
    setDocs([]);
  }, [setDocs]);

  const onOpen = React.useCallback((doc) => {
    try {
      let url = doc && doc.blobUrl;
      if (!url) {
        const placeholder = new Blob([
          `My Digital Library\n\n`+
          `File: ${doc.name}\n`+
          `Type: ${doc.type || 'unknown'}\n`+
          `Size: ${humanSize(doc.size || 0)}\n`+
          `Note: Content is available only for files added this session. Re-upload to preview the original file.\n`
        ], { type: 'text/plain' });
        url = URL.createObjectURL(placeholder);
      }
      const win = window.open(url, '_blank', 'noopener');
      if (!win) alert('Please allow pop-ups to open the document.');
    } catch (e) {
      alert('Unable to open this document.');
    }
  }, []);

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
            <Dropzone onFiles={onFiles} disabled={uploadLocked} />
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
                <label className="btn primary" aria-disabled={uploadLocked} style={uploadLocked?{opacity:.6, pointerEvents:'none'}:undefined}>
                  <input id="add-more" type="file" multiple disabled={uploadLocked} onChange={(e)=> onFiles(e.target.files)} />
                  Add More
                </label>
                <a className="btn primary" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener noreferrer" title="Open Google Drive">
                  Google Drive
                </a>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div id="empty-state" className="empty">
                <div className="empty-art">🗂️</div>
                <p>{docs.length ? 'No matching documents.' : 'No documents yet. Drag and drop some files on the Upload tab.'}</p>
              </div>
            ) : (
              <DocsList docs={filtered} onRemove={onRemove} onOpen={onOpen} />
            )}
          </div>
        </section>
      )}
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

 


