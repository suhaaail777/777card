'use strict';
const $ = id => document.getElementById(id);

const PALETTE = {
  purple:  { grad: 'linear-gradient(135deg,#7968ed,#4534b8)', hex: '#7968ed' },
  blue:    { grad: 'linear-gradient(135deg,#3299d8,#17518f)', hex: '#3299d8' },
  green:   { grad: 'linear-gradient(135deg,#2dbb91,#08745e)', hex: '#2dbb91' },
  dark:    { grad: 'linear-gradient(135deg,#45516a,#151d2c)', hex: '#45516a' },
  orange:  { grad: 'linear-gradient(135deg,#f39b54,#bd542d)', hex: '#f39b54' },
  rose:    { grad: 'linear-gradient(135deg,#e77ca2,#a83f71)', hex: '#e77ca2' },
  gold:    { grad: 'linear-gradient(135deg,#f5c842,#c48a00)', hex: '#f5c842' },
  slate:   { grad: 'linear-gradient(135deg,#6e7f9c,#3a4a60)', hex: '#6e7f9c' },
};

const STORAGE_KEY = 'cardvault_cards_v2';
let cards = [], active = 'All', sortNewest = true, scannerStream = null, detector = null;
const categories = ['All','Identity','Bank','Membership','Loyalty','Travel','Other'];

// ── IndexedDB for photos ─────────────────────────────────────────────────────
let photoDB = null;
function openPhotoDB() {
  return new Promise((resolve, reject) => {
    if (photoDB) return resolve(photoDB);
    const req = indexedDB.open('cardvault_photos', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('photos');
    req.onsuccess = e => { photoDB = e.target.result; resolve(photoDB); };
    req.onerror = () => reject(req.error);
  });
}
async function savePhoto(id, side, dataUrl) {
  if (!dataUrl) return;
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(dataUrl, `${id}_${side}`);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
async function loadPhoto(id, side) {
  try {
    const db = await openPhotoDB();
    return new Promise(resolve => {
      const req = db.transaction('photos').objectStore('photos').get(`${id}_${side}`);
      req.onsuccess = () => resolve(req.result || '');
      req.onerror = () => resolve('');
    });
  } catch { return ''; }
}
async function deletePhotos(id) {
  try {
    const db = await openPhotoDB();
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').delete(`${id}_front`);
    tx.objectStore('photos').delete(`${id}_back`);
  } catch {}
}

// ── Colour swatches ──────────────────────────────────────────────────────────
function buildSwatches(selectedColor = 'purple') {
  const wrap = $('colorSwatches');
  wrap.innerHTML = Object.entries(PALETTE).map(([key, p]) =>
    `<div class="color-swatch${key === selectedColor ? ' selected' : ''}"
      style="background:${p.grad}" data-color="${key}" title="${key}"></div>`
  ).join('');
  $('color').value = selectedColor;
  wrap.querySelectorAll('.color-swatch').forEach(s => {
    s.addEventListener('click', () => {
      wrap.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
      s.classList.add('selected');
      $('color').value = s.dataset.color;
    });
  });
}

// ── Utilities ────────────────────────────────────────────────────────────────
function toast(s) {
  $('toast').textContent = s;
  $('toast').classList.add('show');
  setTimeout(() => $('toast').classList.remove('show'), 2600);
}
function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function loadCards() {
  try { const s = localStorage.getItem(STORAGE_KEY); cards = s ? JSON.parse(s) : []; if (!Array.isArray(cards)) cards = []; }
  catch(e) { cards = []; toast('Could not read saved cards.'); }
}
// Save only metadata — no photos in localStorage
function saveVault() {
  const meta = cards.map(({ front: _f, back: _b, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  $('totalCount').textContent = cards.length;
  $('categoryCount').textContent = new Set(cards.map(c => c.category)).size;

  $('filters').innerHTML = categories.map(c =>
    `<button class="${active === c ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');

  const q = $('searchInput').value.toLowerCase();
  let list = cards.filter(c =>
    (active === 'All' || c.category === active) &&
    [c.name, c.holder, c.number, c.category].join(' ').toLowerCase().includes(q)
  );
  list.sort((a, b) => sortNewest ? b.created - a.created : a.name.localeCompare(b.name));

  if (!list.length) {
    $('cards').innerHTML = `<div class="wl-empty">
      <div class="wl-empty-icon">💳</div>
      <h3>${cards.length ? 'No matching cards' : 'No cards yet'}</h3>
      <p>${cards.length ? 'Try another search or category.' : 'Tap + to add your first card.'}</p>
    </div>`;
    return;
  }

  $('cards').innerHTML = list.map(c => {
    const p = PALETTE[c.color] || PALETTE.purple;
    const num = c.number ? '•••• ' + esc(c.number.slice(-4)) : '';
    return `<article class="wl-card" style="background:${p.grad}" data-open="${esc(c.id)}">
      <div class="wl-card-top">
        <span class="wl-card-chip">${esc(c.category)}</span>
        <button class="wl-card-menu" data-menu="${esc(c.id)}" aria-label="Options">···</button>
      </div>
      <div class="wl-card-name">${esc(c.name)}</div>
      <div class="wl-card-holder">${esc(c.holder || 'CARDHOLDER')}</div>
      <div class="wl-card-bottom">
        <span class="wl-card-number">${num}</span>
        <span class="wl-card-expiry">${esc(c.expiry || '')}</span>
      </div>
    </article>`;
  }).join('');
}

// ── Form ─────────────────────────────────────────────────────────────────────
function openForm(c = null) {
  $('cardForm').reset();
  $('editId').value = c?.id || '';
  $('formTitle').textContent = c ? 'Edit Card' : 'New Card';
  if (c) ['name','holder','number','expiry','notes'].forEach(k => $(k).value = c[k] || '');
  buildSwatches(c?.color || 'purple');
  // Reset photo buttons
  $('captureFront').innerHTML = `<span>📷 Front</span>`; $('captureFront')._capturedDataUrl = null;
  $('captureBack').innerHTML  = `<span>📷 Back</span>`;  $('captureBack')._capturedDataUrl  = null;
  showSheet('formOverlay');
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

$('cardForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const id = $('editId').value, old = cards.find(c => c.id === id);
    const newFront = await readImageOrCapture('frontImage', 'captureFront');
    const newBack  = await readImageOrCapture('backImage',  'captureBack');
    const cardId = id || crypto.randomUUID();
    // Save photos to IndexedDB only if new ones were provided
    if (newFront) await savePhoto(cardId, 'front', newFront);
    if (newBack)  await savePhoto(cardId, 'back',  newBack);
    const c = {
      id: cardId,
      name: $('name').value.trim(),
      category: $('category').value,
      holder: $('holder').value.trim(),
      number: $('number').value.trim(),
      expiry: $('expiry').value.trim(),
      color: $('color').value || 'purple',
      notes: $('notes').value.trim(),
      created: old?.created || Date.now(),
    };
    if (old) cards = cards.map(x => x.id === id ? c : x);
    else cards.unshift(c);
    saveVault();
    hideSheet('formOverlay');
    render();
    toast('Card saved.');
  } catch(err) { toast('Could not save: ' + err.message); }
});

// ── Detail ───────────────────────────────────────────────────────────────────
async function detail(id) {
  const c = cards.find(x => x.id === id);
  if (!c) return;
  const p = PALETTE[c.color] || PALETTE.purple;
  const [front, back] = await Promise.all([loadPhoto(id, 'front'), loadPhoto(id, 'back')]);
  const rows = [
    ['Category', c.category],
    ['Cardholder', c.holder || '—'],
    ['Number / Code', c.number || '—'],
    ['Expiry', c.expiry || '—'],
    ['Notes', c.notes || '—'],
  ];
  $('detailContent').innerHTML = `
    <div class="detail-card-preview" style="background:${p.grad}">
      <span class="wl-card-chip">${esc(c.category)}</span>
      <div class="detail-card-name">${esc(c.name)}</div>
      <div class="detail-card-holder">${esc(c.holder || 'CARDHOLDER')}</div>
      <div class="detail-card-bottom">
        <span>${c.number ? '•••• ' + esc(c.number.slice(-4)) : ''}</span>
        <strong>${esc(c.expiry || '')}</strong>
      </div>
    </div>
    ${front ? `<div style="padding:0 20px 4px"><img class="detail-img" src="${front}" alt="Card front"></div>` : ''}
    <div class="detail-rows">
      ${rows.map(([l,v]) => `<div class="detail-row"><span class="detail-row-label">${l}</span><span class="detail-row-value">${esc(v)}</span></div>`).join('')}
    </div>
    ${back ? `<div style="padding:4px 20px"><img class="detail-img" src="${back}" alt="Card back"></div>` : ''}
    <div class="detail-actions">
      <button class="btn-action" id="editCard">Edit</button>
      <button class="btn-action danger" id="deleteCard">Delete</button>
    </div>`;
  showSheet('detailOverlay');
  $('editCard').onclick = () => { hideSheet('detailOverlay'); openForm(c); };
  $('deleteCard').onclick = async () => {
    if (confirm('Delete this card permanently?')) {
      cards = cards.filter(x => x.id !== id);
      saveVault();
      await deletePhotos(id);
      hideSheet('detailOverlay');
      render();
      toast('Card deleted.');
    }
  };
}

// ── Sheet helpers ─────────────────────────────────────────────────────────────
function showSheet(id) { $(id).classList.add('show'); }
function hideSheet(id) { $(id).classList.remove('show'); }

// ── Event wiring ──────────────────────────────────────────────────────────────
$('addBtn').onclick = () => openForm();

$('themeBtn').onclick = () => {
  document.body.classList.toggle('dark');
  const dark = document.body.classList.contains('dark');
  $('themeBtn').querySelector('svg path').setAttribute('d',
    dark
      ? 'M12 3v1m0 16v1M4.22 4.22l.7.7m12.16 12.16.7.7M3 12h1m16 0h1M4.92 19.08l.7-.7M18.36 5.64l.7-.7M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z'
      : 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z'
  );
};

$('searchInput').oninput = render;

$('sortBtn').onclick = () => {
  sortNewest = !sortNewest;
  $('sortBtn').textContent = sortNewest ? 'Recently added' : 'Name A–Z';
  render();
};

$('filters').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]');
  if (b) { active = b.dataset.cat; render(); }
});

$('cards').addEventListener('click', e => {
  const m = e.target.closest('[data-menu]');
  const c = e.target.closest('[data-open]');
  if (m) { e.stopPropagation(); detail(m.dataset.menu); }
  else if (c) detail(c.dataset.open);
});

document.querySelectorAll('[data-close]').forEach(b =>
  b.onclick = () => {
    hideSheet(b.dataset.close);
    if (b.dataset.close === 'scannerOverlay') stopScanner();
  }
);

['formOverlay','detailOverlay','scannerOverlay'].forEach(id =>
  $(id).addEventListener('click', e => {
    if (e.target.id === id) {
      hideSheet(id);
      if (id === 'scannerOverlay') stopScanner();
    }
  })
);

// ── Camera capture (rectangle crop) ────────────────────────────────────────────────────
let cameraStream = null, captureTarget = null; // 'front' | 'back'
// Card aspect ratio 85.6mm × 54mm ≈ 1.586
const CARD_RATIO = 85.6 / 54;

function positionFrame() {
  const frame = $('camFrame');
  const vw = window.innerWidth, vh = window.innerHeight;
  const margin = 28;
  let w = vw - margin * 2;
  let h = w / CARD_RATIO;
  if (h > vh * 0.52) { h = vh * 0.52; w = h * CARD_RATIO; }
  const left = (vw - w) / 2, top = (vh - h) / 2 - 20;
  Object.assign(frame.style, { width: w+'px', height: h+'px', left: left+'px', top: top+'px' });
  $('camHint').style.top = (top + h + 14) + 'px';
}

async function openCamera(side) {
  captureTarget = side;
  $('camLabel').textContent = side === 'front' ? 'Card Front' : 'Card Back';
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    $('cameraVideo').srcObject = cameraStream;
    $('cameraOverlay').classList.add('show');
    positionFrame();
  } catch(e) {
    // fallback to file picker
    $(side === 'front' ? 'frontImage' : 'backImage').click();
  }
}

function closeCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  $('cameraVideo').srcObject = null;
  $('cameraOverlay').classList.remove('show');
}

function captureFrame() {
  const video = $('cameraVideo');
  const frame = $('camFrame');
  const canvas = $('camCanvas');
  const vw = window.innerWidth, vh = window.innerHeight;

  // Frame rect in screen coords
  const fx = parseFloat(frame.style.left), fy = parseFloat(frame.style.top);
  const fw = parseFloat(frame.style.width), fh = parseFloat(frame.style.height);

  // Map screen rect to video pixel coords
  const vNatW = video.videoWidth, vNatH = video.videoHeight;
  const rendered = video.getBoundingClientRect();
  const scaleX = vNatW / rendered.width;
  const scaleY = vNatH / rendered.height;
  const offX = rendered.left, offY = rendered.top;

  const sx = (fx - offX) * scaleX;
  const sy = (fy - offY) * scaleY;
  const sw = fw * scaleX;
  const sh = fh * scaleY;

  canvas.width = sw; canvas.height = sh;
  canvas.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const side = captureTarget;
  closeCamera();

  // Show thumbnail on button
  const btn = side === 'front' ? $('captureFront') : $('captureBack');
  btn.innerHTML = `<img src="${dataUrl}"><span style="font-size:11px;color:var(--ink2);margin-top:4px">${side === 'front' ? 'Front' : 'Back'} ✓</span>`;

  // Store on the hidden input via a DataTransfer trick, or just stash on element
  btn._capturedDataUrl = dataUrl;
  toast('Photo captured ✓');
}

$('captureFront').onclick = () => openCamera('front');
$('captureBack').onclick  = () => openCamera('back');
$('camCancel').onclick    = closeCamera;
$('camShutter').onclick   = captureFrame;
window.addEventListener('resize', () => { if ($('cameraOverlay').classList.contains('show')) positionFrame(); });

// File picker fallback
$('frontImage').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  const url = URL.createObjectURL(file);
  $('captureFront').innerHTML = `<img src="${url}"><span style="font-size:11px;color:var(--ink2);margin-top:4px">Front ✓</span>`;
  $('captureFront')._capturedDataUrl = null; // will be read from input
};
$('backImage').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  const url = URL.createObjectURL(file);
  $('captureBack').innerHTML = `<img src="${url}"><span style="font-size:11px;color:var(--ink2);margin-top:4px">Back ✓</span>`;
  $('captureBack')._capturedDataUrl = null;
};

// Override readImage to also handle captured dataUrls
async function readImageOrCapture(inputId, btnId) {
  const btn = $(btnId);
  if (btn._capturedDataUrl) return btn._capturedDataUrl;
  return readImage($(inputId).files[0]);
}

async function startScanner() {
  if (!navigator.mediaDevices?.getUserMedia) { toast('Camera requires HTTPS.'); return; }
  if (!('BarcodeDetector' in window)) { toast('Barcode scanning not supported in this browser.'); return; }
  try {
    const formats = await BarcodeDetector.getSupportedFormats();
    detector = new BarcodeDetector({ formats });
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    $('scannerVideo').srcObject = scannerStream;
    showSheet('scannerOverlay');
    $('scannerResult').textContent = 'Scanning…';
    scanLoop();
  } catch(e) { toast('Could not open camera.'); }
}

async function scanLoop() {
  if (!scannerStream) return;
  try {
    const v = $('scannerVideo');
    if (v.readyState >= 2) {
      const hits = await detector.detect(v);
      if (hits.length) {
        $('number').value = hits[0].rawValue;
        stopScanner();
        hideSheet('scannerOverlay');
        toast('Code scanned ✓');
        return;
      }
    }
  } catch(e) {}
  if (scannerStream) requestAnimationFrame(scanLoop);
}

function stopScanner() {
  if (scannerStream) { scannerStream.getTracks().forEach(t => t.stop()); scannerStream = null; }
  $('scannerVideo').srcObject = null;
}

$('scanBtn').onclick = startScanner;
$('stopScan').onclick = stopScanner;
$('manualScanClose').onclick = () => { hideSheet('scannerOverlay'); stopScanner(); };

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  loadCards();
  render();
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch(e) { console.warn('SW registration failed', e); }
  }
})();
