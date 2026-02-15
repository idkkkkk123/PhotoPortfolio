// =====================================================
// DISPLAY EDITOR — Full rewrite
// 3-panel layout: Left controls | Center canvas | Right gallery
// =====================================================

// --- Debounce utility ---
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// --- Thumbnail Generation ---
async function generateThumbnail(page, width = 400, height = 300) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = page.background || '#ffffff';
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / page.width, height / page.height);
  for (const item of page.items) {
    if (item.type === 'image') {
      const img = new Image();
      img.src = item.src;
      await new Promise(r => { img.onload = () => {
        ctx.save();
        ctx.globalAlpha = (item.opacity != null ? item.opacity : 100) / 100;
        const x = item.x * scale, y = item.y * scale, w = item.width * scale, h = item.height * scale;
        ctx.translate(x + w/2, y + h/2);
        ctx.rotate((item.rotation * Math.PI) / 180);
        const fh = item.flipH ? -1 : 1, fv = item.flipV ? -1 : 1;
        if (fh !== 1 || fv !== 1) ctx.scale(fh, fv);
        const filters = [];
        if (item.brightness != null && item.brightness !== 100) filters.push(`brightness(${item.brightness}%)`);
        if (item.contrast != null && item.contrast !== 100) filters.push(`contrast(${item.contrast}%)`);
        if (item.saturate != null && item.saturate !== 100) filters.push(`saturate(${item.saturate}%)`);
        if (item.grayscale) filters.push(`grayscale(${item.grayscale}%)`);
        if (item.blur) filters.push(`blur(${item.blur * scale}px)`);
        if (filters.length) ctx.filter = filters.join(' ');
        if (item.borderRadius) {
          const rad = Math.min(w, h) * (item.borderRadius / 100);
          ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, rad); ctx.clip();
        }
        ctx.drawImage(img, -w/2, -h/2, w, h);
        ctx.restore(); r();
      }; img.onerror = r; });
    }
  }
  return c.toDataURL('image/png');
}

// --- State ---
let displayState = null;
let currentPage = null;
let selectedItem = null;
let historyStack = [];
let historyPointer = -1;
let isDragging = false;
let isResizing = false;
let dragOffset = { x: 0, y: 0 };

// --- Dirty state tracking ---
let _lastSavedSnapshot = null;
let _isDirty = false;

function markDirty() {
  _isDirty = true;
  updateSaveIndicator();
}

function markClean() {
  _isDirty = false;
  _lastSavedSnapshot = JSON.stringify(displayState);
  updateSaveIndicator();
}

function checkDirty() {
  if (!displayState) return false;
  return _isDirty || JSON.stringify(displayState) !== _lastSavedSnapshot;
}

function updateSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
  const dirty = checkDirty();
  el.textContent = dirty ? 'Unsaved' : 'Saved';
  el.className = 'de-save-indicator ' + (dirty ? 'unsaved' : 'saved');
}

// --- DOM refs (set on DOMContentLoaded) ---
let displayCanvas, displayNameInput, loadModal, layerList, galleryPreview, pageTabs;
let itemControls, itemPropsActive, filterControls, filterPlaceholder;

// =====================================================
// INITIALIZATION
// =====================================================
async function initializeDisplay() {
  displayCanvas = document.getElementById('displayCanvas');
  displayNameInput = document.getElementById('displayName');
  loadModal = document.getElementById('loadModal');
  layerList = document.getElementById('layerList');
  galleryPreview = document.getElementById('galleryPreview');
  pageTabs = document.getElementById('pageTabs');
  itemControls = document.getElementById('itemControls');
  itemPropsActive = document.getElementById('itemPropsActive');
  filterControls = document.getElementById('filterControls');
  filterPlaceholder = document.getElementById('filterPlaceholder');

  // Auth check & show/hide nav elements
  if (isLoggedIn()) {
    const loginBtn = document.getElementById('navLoginBtn');
    const logoutBtn = document.getElementById('navLogoutBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = '';
    // Load data from server
    await initAppData();
  }

  const savedDisplayId = loadCurrentDisplay();
  if (savedDisplayId) {
    const displays = loadDisplays();
    displayState = displays.find(d => d.id === savedDisplayId);
  }
  if (!displayState) {
    displayState = createNewDisplay('Untitled Collage');
    if (isLoggedIn()) {
      await saveDisplayToServer(displayState);
    }
    saveCurrentDisplay(displayState.id);
  }

  currentPage = displayState.pages[0];
  displayNameInput.value = displayState.name;
  historyStack = [JSON.parse(JSON.stringify(displayState))];
  historyPointer = 0;
  markClean();

  renderPage();
  renderPageTabs();
  await renderGalleryPreviewAsync();
  setActiveNav();
  bindAllEvents();
}

// =====================================================
// RENDERING
// =====================================================
function renderPage() {
  if (!currentPage) return;
  displayCanvas.innerHTML = '';
  displayCanvas.style.background = currentPage.background || '#ffffff';
  displayCanvas.style.aspectRatio = `${currentPage.width} / ${currentPage.height}`;

  // Grid overlay
  if (document.getElementById('gridSnapToggle').checked) {
    const gs = parseInt(document.getElementById('gridSize').value) || 20;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;opacity:0.5;';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const pat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pat.setAttribute('id','grid'); pat.setAttribute('width',gs); pat.setAttribute('height',gs);
    pat.setAttribute('patternUnits','userSpaceOnUse');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M ${gs} 0 L 0 0 0 ${gs}`);
    p.setAttribute('fill','none'); p.setAttribute('stroke','#b0b0b5'); p.setAttribute('stroke-width','0.5');
    pat.appendChild(p); defs.appendChild(pat); svg.appendChild(defs);
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('width','100%'); r.setAttribute('height','100%'); r.setAttribute('fill','url(#grid)');
    svg.appendChild(r); displayCanvas.appendChild(svg);
  }

  currentPage.items.forEach(item => renderItem(item));
  renderLayerPanel();
  updateCanvasBgInput();
  updateCanvasSizeLabel();
}

function updateCanvasSizeLabel() {
  const label = document.getElementById('canvasSizeLabel');
  if (label && currentPage) {
    label.textContent = `${currentPage.width} × ${currentPage.height}`;
  }
  // Sync canvas width/height inputs
  const wInput = document.getElementById('canvasWidth');
  const hInput = document.getElementById('canvasHeight');
  if (wInput && currentPage) wInput.value = currentPage.width;
  if (hInput && currentPage) hInput.value = currentPage.height;
}

function renderItem(item) {
  const div = document.createElement('div');
  div.className = 'de-item';
  div.dataset.itemId = item.id;
  // Use percentage positioning so items scale with the CSS canvas size
  const pw = currentPage.width, ph = currentPage.height;
  div.style.left = (item.x / pw * 100) + '%';
  div.style.top = (item.y / ph * 100) + '%';
  div.style.width = (item.width / pw * 100) + '%';
  div.style.height = (item.height / ph * 100) + '%';
  div.style.zIndex = item.zIndex || 1;

  // Build transform
  let transform = `rotate(${item.rotation || 0}deg)`;
  const fh = item.flipH ? -1 : 1;
  const fv = item.flipV ? -1 : 1;
  if (fh !== 1 || fv !== 1) transform += ` scale(${fh},${fv})`;
  div.style.transform = transform;

  div.style.opacity = (item.opacity != null ? item.opacity : 100) / 100;
  div.style.borderRadius = (item.borderRadius || 0) + '%';

  if (selectedItem && selectedItem.id === item.id) div.classList.add('selected');

  if (item.type === 'image') {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = 'Canvas image';
    img.draggable = false;

    // CSS filters
    const filters = [];
    if (item.brightness != null && item.brightness !== 100) filters.push(`brightness(${item.brightness}%)`);
    if (item.contrast != null && item.contrast !== 100) filters.push(`contrast(${item.contrast}%)`);
    if (item.saturate != null && item.saturate !== 100) filters.push(`saturate(${item.saturate}%)`);
    if (item.grayscale) filters.push(`grayscale(${item.grayscale}%)`);
    if (item.blur) filters.push(`blur(${item.blur}px)`);
    if (filters.length) img.style.filter = filters.join(' ');

    img.style.borderRadius = (item.borderRadius || 0) + '%';
    div.appendChild(img);

    // Resize handles when selected
    if (selectedItem && selectedItem.id === item.id) {
      ['nw','ne','sw','se'].forEach(corner => {
        const h = document.createElement('div');
        h.className = 'de-resize-handle de-handle-' + corner;
        h.dataset.corner = corner;
        h.addEventListener('mousedown', e => startResize(e, item, corner));
        div.appendChild(h);
      });
    }
  }

  div.addEventListener('mousedown', e => {
    if (!e.target.classList.contains('de-resize-handle')) {
      selectItem(item);
      startDrag(e, item);
    }
  });

  displayCanvas.appendChild(div);
}

function renderLayerPanel() {
  if (!layerList || !currentPage) return;
  layerList.innerHTML = '';
  const sorted = [...currentPage.items].sort((a, b) => (b.zIndex||0) - (a.zIndex||0));
  if (sorted.length === 0) {
    layerList.innerHTML = '<div class="de-props-placeholder">No layers yet</div>';
    return;
  }
  sorted.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'de-layer-item';
    if (selectedItem && selectedItem.id === item.id) div.classList.add('selected');
    const thumb = document.createElement('div');
    thumb.className = 'de-layer-thumb';
    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = item.src; img.alt = '';
      thumb.appendChild(img);
    }
    div.appendChild(thumb);
    const label = document.createElement('span');
    label.className = 'de-layer-label';
    label.textContent = (item.type === 'image' ? 'Image' : 'Item') + ' ' + (sorted.length - i);
    div.appendChild(label);
    div.addEventListener('click', () => selectItem(item));
    layerList.appendChild(div);
  });
}

function renderPageTabs() {
  if (!pageTabs) return;
  pageTabs.innerHTML = '';
  displayState.pages.forEach((page, index) => {
    const btn = document.createElement('button');
    btn.className = 'de-page-tab';
    if (page.id === currentPage.id) btn.classList.add('active');
    btn.textContent = `Page ${index + 1}`;
    btn.addEventListener('click', () => switchPage(page.id));
    pageTabs.appendChild(btn);
  });
}

function renderGalleryPreview() {
  if (!galleryPreview) return;
  galleryPreview.innerHTML = '';
  const photos = loadPhotos();
  if (photos.length === 0) {
    galleryPreview.innerHTML = '<div class="de-props-placeholder">No photos in gallery.<br>Upload photos on the Upload page first.</div>';
    return;
  }
  photos.forEach(photo => {
    const wrap = document.createElement('div');
    wrap.className = 'de-gallery-thumb';
    const img = document.createElement('img');
    img.src = photo.src; img.alt = photo.name || ''; img.title = photo.name || '';
    img.draggable = false;
    wrap.appendChild(img);
    wrap.addEventListener('click', () => addPhotoToCanvas(photo.src));
    galleryPreview.appendChild(wrap);
  });
}

async function renderGalleryPreviewAsync() {
  if (!galleryPreview) return;
  galleryPreview.innerHTML = '<div class="de-props-placeholder">Loading photos...</div>';
  if (isLoggedIn()) {
    await loadPhotosAsync();
  }
  renderGalleryPreview();
}

function updateCanvasBgInput() {
  const inp = document.getElementById('canvasBgColor');
  if (inp && currentPage) inp.value = currentPage.background || '#ffffff';
}

// =====================================================
// SELECTION & CONTROLS
// =====================================================
function selectItem(item) {
  // Avoid re-render if same item is already selected (prevents drag jump)
  if (selectedItem && selectedItem.id === item.id) {
    // Sync latest position from the page data
    const pageItem = currentPage.items.find(i => i.id === item.id);
    if (pageItem) selectedItem = JSON.parse(JSON.stringify(pageItem));
    showItemControls();
    return;
  }
  selectedItem = JSON.parse(JSON.stringify(item));
  renderPage();
  showItemControls();
}

function deselectItem() {
  selectedItem = null;
  hideItemControls();
  renderPage();
}

function showItemControls() {
  if (!selectedItem) return;
  itemControls.style.display = 'none';
  itemPropsActive.style.display = 'block';
  filterControls.style.display = 'block';
  filterPlaceholder.style.display = 'none';

  document.getElementById('posX').value = Math.round(selectedItem.x);
  document.getElementById('posY').value = Math.round(selectedItem.y);
  document.getElementById('sizeW').value = Math.round(selectedItem.width);
  document.getElementById('sizeH').value = Math.round(selectedItem.height);

  const rot = selectedItem.rotation || 0;
  document.getElementById('rotateSlider').value = rot;
  document.getElementById('rotateValue').textContent = rot;

  const op = selectedItem.opacity != null ? selectedItem.opacity : 100;
  document.getElementById('opacitySlider').value = op;
  document.getElementById('opacityValue').textContent = op;

  const br = selectedItem.borderRadius || 0;
  document.getElementById('radiusSlider').value = br;
  document.getElementById('radiusValue').textContent = br;

  // Filters
  document.getElementById('brightnessSlider').value = selectedItem.brightness || 100;
  document.getElementById('brightnessValue').textContent = selectedItem.brightness || 100;
  document.getElementById('contrastSlider').value = selectedItem.contrast || 100;
  document.getElementById('contrastValue').textContent = selectedItem.contrast || 100;
  document.getElementById('saturateSlider').value = selectedItem.saturate || 100;
  document.getElementById('saturateValue').textContent = selectedItem.saturate || 100;
  document.getElementById('grayscaleSlider').value = selectedItem.grayscale || 0;
  document.getElementById('grayscaleValue').textContent = selectedItem.grayscale || 0;
  document.getElementById('blurSlider').value = selectedItem.blur || 0;
  document.getElementById('blurValue').textContent = selectedItem.blur || 0;
}

function hideItemControls() {
  itemControls.style.display = 'block';
  if (itemPropsActive) itemPropsActive.style.display = 'none';
  if (filterControls) filterControls.style.display = 'none';
  if (filterPlaceholder) filterPlaceholder.style.display = 'block';
}

// =====================================================
// COORDINATE HELPERS
// =====================================================
function getCanvasScale() {
  if (!currentPage || !displayCanvas) return 1;
  const rect = displayCanvas.getBoundingClientRect();
  return rect.width / currentPage.width;
}

function screenToCanvas(screenX, screenY) {
  const rect = displayCanvas.getBoundingClientRect();
  const scale = getCanvasScale();
  return {
    x: (screenX - rect.left) / scale,
    y: (screenY - rect.top) / scale
  };
}

// =====================================================
// DRAGGING
// =====================================================
function startDrag(e, item) {
  if (e.button !== 0) return;
  isDragging = true;
  // Always use selectedItem (authoritative deep copy) for offset, not the stale item ref
  const src = selectedItem && selectedItem.id === item.id ? selectedItem : item;
  const pos = screenToCanvas(e.clientX, e.clientY);
  dragOffset.x = pos.x - src.x;
  dragOffset.y = pos.y - src.y;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
}

function onDrag(e) {
  if (!isDragging || !selectedItem) return;
  const pos = screenToCanvas(e.clientX, e.clientY);
  let x = pos.x - dragOffset.x;
  let y = pos.y - dragOffset.y;
  if (document.getElementById('gridSnapToggle').checked) {
    const gs = parseInt(document.getElementById('gridSize').value) || 20;
    x = Math.round(x / gs) * gs;
    y = Math.round(y / gs) * gs;
  }
  selectedItem.x = Math.max(0, x);
  selectedItem.y = Math.max(0, y);
  // Direct DOM update for snappy drag (avoid full re-render)
  const el = displayCanvas.querySelector(`[data-item-id="${selectedItem.id}"]`);
  if (el) {
    const pw = currentPage.width, ph = currentPage.height;
    el.style.left = (selectedItem.x / pw * 100) + '%';
    el.style.top = (selectedItem.y / ph * 100) + '%';
  }
  updateItemInPage(selectedItem);
  showItemControls();
}

function endDrag() {
  if (!isDragging) return;
  isDragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
  pushHistory();
  updateCurrentDisplay();
}

// =====================================================
// RESIZING
// =====================================================
function startResize(e, item, corner) {
  e.stopPropagation();
  isResizing = true;
  const scale = getCanvasScale();
  const startX = e.clientX, startY = e.clientY;
  // Use selectedItem (authoritative) for start values, not the closure's item ref
  const src = selectedItem && selectedItem.id === item.id ? selectedItem : item;
  const startW = src.width, startH = src.height;
  const startIX = src.x, startIY = src.y;

  function onResize(me) {
    const dx = (me.clientX - startX) / scale;
    const dy = (me.clientY - startY) / scale;
    const min = 30;
    let nw = startW, nh = startH, nx = startIX, ny = startIY;
    if (corner.includes('e')) nw = Math.max(min, startW + dx);
    if (corner.includes('w')) { nx = startIX + dx; nw = Math.max(min, startW - dx); }
    if (corner.includes('s')) nh = Math.max(min, startH + dy);
    if (corner.includes('n')) { ny = startIY + dy; nh = Math.max(min, startH - dy); }
    selectedItem.width = nw; selectedItem.height = nh;
    selectedItem.x = nx; selectedItem.y = ny;
    // Direct DOM update for snappy resize
    const el = displayCanvas.querySelector(`[data-item-id="${selectedItem.id}"]`);
    if (el) {
      const pw = currentPage.width, ph = currentPage.height;
      el.style.left = (nx / pw * 100) + '%'; el.style.top = (ny / ph * 100) + '%';
      el.style.width = (nw / pw * 100) + '%'; el.style.height = (nh / ph * 100) + '%';
    }
    updateItemInPage(selectedItem);
    showItemControls();
  }
  function endResize() {
    isResizing = false;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', endResize);
    pushHistory();
    updateCurrentDisplay();
  }
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', endResize);
}

// =====================================================
// PHOTO MANAGEMENT
// =====================================================
function addPhotoToCanvas(src, x, y) {
  pushHistory();
  const defaultSize = Math.round(Math.min(currentPage.width, currentPage.height) * 0.2);
  if (x == null) x = Math.round(currentPage.width * 0.02 + Math.random() * currentPage.width * 0.05);
  if (y == null) y = Math.round(currentPage.height * 0.02 + Math.random() * currentPage.height * 0.05);
  const item = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type: 'image', x, y, width: defaultSize, height: defaultSize,
    rotation: 0, opacity: 100, borderRadius: 0,
    brightness: 100, contrast: 100, saturate: 100, grayscale: 0, blur: 0,
    flipH: false, flipV: false,
    zIndex: Math.max(0, ...currentPage.items.map(i => i.zIndex || 0)) + 1,
    src: src
  };
  currentPage.items.push(item);
  selectItem(item);
  renderPage();
  updateCurrentDisplay();
}

// =====================================================
// PAGE MANAGEMENT
// =====================================================
function switchPage(pageId) {
  const page = displayState.pages.find(p => p.id === pageId);
  if (page) {
    currentPage = page;
    selectedItem = null;
    hideItemControls();
    renderPage();
    renderPageTabs();
    updateCurrentDisplay();
  }
}

// =====================================================
// PERSISTENCE
// =====================================================
function updateItemInPage(item) {
  const idx = currentPage.items.findIndex(i => i.id === item.id);
  if (idx !== -1) currentPage.items[idx] = JSON.parse(JSON.stringify(item));
}

function updateCurrentDisplay() {
  displayState.lastModified = new Date().toISOString();
  markDirty();
  // Update local cache only — actual server save happens on explicit Save
  const displays = loadDisplays();
  const idx = displays.findIndex(d => d.id === displayState.id);
  if (idx !== -1) {
    displays[idx] = JSON.parse(JSON.stringify(displayState));
  }
}

// =====================================================
// UNDO / REDO
// =====================================================
function pushHistory() {
  historyPointer++;
  if (historyPointer < historyStack.length) historyStack = historyStack.slice(0, historyPointer);
  historyStack.push(JSON.parse(JSON.stringify(displayState)));
  if (historyStack.length > 50) { historyStack.shift(); historyPointer--; }
}

function undo() {
  if (historyPointer > 0) {
    historyPointer--;
    displayState = JSON.parse(JSON.stringify(historyStack[historyPointer]));
    currentPage = displayState.pages.find(p => p.id === currentPage.id) || displayState.pages[0];
    selectedItem = null; hideItemControls();
    displayNameInput.value = displayState.name;
    renderPage(); renderPageTabs(); updateCurrentDisplay();
  }
}

function redo() {
  if (historyPointer < historyStack.length - 1) {
    historyPointer++;
    displayState = JSON.parse(JSON.stringify(historyStack[historyPointer]));
    currentPage = displayState.pages.find(p => p.id === currentPage.id) || displayState.pages[0];
    selectedItem = null; hideItemControls();
    displayNameInput.value = displayState.name;
    renderPage(); renderPageTabs(); updateCurrentDisplay();
  }
}

// =====================================================
// EXPORT — Advanced with format/scale/DPI/transparency/PDF
// =====================================================
async function openExportModal() {
  const modal = document.getElementById('exportModal');
  if (!modal) return;
  document.getElementById('exportFormat').value = 'png';
  document.getElementById('exportScale').value = '1';
  document.getElementById('exportDpi').value = '300';
  document.getElementById('exportQuality').value = 92;
  document.getElementById('exportQualityVal').textContent = '92%';
  document.getElementById('exportTransparent').checked = false;
  document.getElementById('exportPdfRow').style.display = 'none';
  document.getElementById('exportTransparencyRow').style.display = '';
  document.getElementById('exportQualityField').style.display = 'none';
  updateExportResLabel();
  // Generate preview thumbnail
  if (currentPage) {
    try {
      const thumb = await generateThumbnail(currentPage, 320, 200);
      document.getElementById('exportPreviewInner').innerHTML = `<img src="${thumb}" alt="Export preview">`;
    } catch(e) { /* ignore */ }
  }
  modal.classList.add('active');
}

function updateExportResLabel() {
  const scaleEl = document.getElementById('exportScale');
  const resEl = document.getElementById('exportResLabel');
  if (!scaleEl || !resEl || !currentPage) return;
  const scale = parseFloat(scaleEl.value) || 1;
  const w = Math.round(currentPage.width * scale);
  const h = Math.round(currentPage.height * scale);
  resEl.textContent = `${w} × ${h} px`;
  updateCanvasSizeLabel();
}

function handleExportFormatChange() {
  const fmt = document.getElementById('exportFormat').value;
  document.getElementById('exportPdfRow').style.display = fmt === 'pdf' ? '' : 'none';
  // Transparency only for png/webp
  document.getElementById('exportTransparencyRow').style.display =
    (fmt === 'png' || fmt === 'webp') ? '' : 'none';
  // Quality slider for jpg/webp
  document.getElementById('exportQualityField').style.display =
    (fmt === 'jpg' || fmt === 'webp') ? '' : 'none';
}

function renderExportCanvas(scale, transparent) {
  return new Promise(resolve => {
    if (!currentPage) return resolve(null);
    const w = currentPage.width * scale, h = currentPage.height * scale;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!transparent) {
      ctx.fillStyle = currentPage.background || '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    const sorted = [...currentPage.items].sort((a, b) => (a.zIndex||0) - (b.zIndex||0));
    if (sorted.length === 0) return resolve(c);
    let loaded = 0;
    sorted.forEach(item => {
      if (item.type === 'image') {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.globalAlpha = (item.opacity != null ? item.opacity : 100) / 100;
          ctx.translate((item.x + item.width/2)*scale, (item.y + item.height/2)*scale);
          ctx.rotate((item.rotation * Math.PI) / 180);
          const fh = item.flipH ? -1 : 1, fv = item.flipV ? -1 : 1;
          ctx.scale(fh, fv);
          // Apply CSS filters via canvas filter property
          const filters = [];
          if (item.brightness != null && item.brightness !== 100) filters.push(`brightness(${item.brightness}%)`);
          if (item.contrast != null && item.contrast !== 100) filters.push(`contrast(${item.contrast}%)`);
          if (item.saturate != null && item.saturate !== 100) filters.push(`saturate(${item.saturate}%)`);
          if (item.grayscale) filters.push(`grayscale(${item.grayscale}%)`);
          if (item.blur) filters.push(`blur(${item.blur * scale}px)`);
          if (filters.length) ctx.filter = filters.join(' ');
          // Apply border-radius via clipping
          const iw = item.width*scale, ih = item.height*scale;
          if (item.borderRadius) {
            const r = Math.min(iw, ih) * (item.borderRadius / 100);
            ctx.beginPath();
            ctx.roundRect(-iw/2, -ih/2, iw, ih, r);
            ctx.clip();
          }
          ctx.drawImage(img, -iw/2, -ih/2, iw, ih);
          ctx.restore();
          loaded++;
          if (loaded === sorted.length) resolve(c);
        };
        img.onerror = () => { loaded++; if (loaded === sorted.length) resolve(c); };
        img.src = item.src;
      }
    });
  });
}

async function performExport() {
  const fmt = document.getElementById('exportFormat').value;
  const scale = parseFloat(document.getElementById('exportScale').value) || 1;
  const transparent = document.getElementById('exportTransparent').checked && (fmt === 'png' || fmt === 'webp');
  const quality = parseInt(document.getElementById('exportQuality').value) / 100;
  const name = displayState.name || 'display';

  const canvas = await renderExportCanvas(scale, transparent);
  if (!canvas) return;

  if (fmt === 'pdf') {
    exportAsPdf(canvas);
  } else {
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', tiff: 'image/png' };
    const mime = mimeMap[fmt] || 'image/png';
    const ext = fmt === 'jpg' ? 'jpg' : fmt;
    const q = (fmt === 'jpg' || fmt === 'webp') ? quality : undefined;
    const url = canvas.toDataURL(mime, q);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-export.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  document.getElementById('exportModal').classList.remove('active');
  showToast(`Exported as ${fmt.toUpperCase()}`);
}

function exportAsPdf(canvas) {
  // Simple PDF export using canvas data embedded in a minimal PDF
  const pageSize = document.getElementById('exportPdfSize').value;
  let pw, ph;
  if (pageSize === 'a4') { pw = 595; ph = 842; }
  else if (pageSize === 'letter') { pw = 612; ph = 792; }
  else if (pageSize === 'a3') { pw = 842; ph = 1191; }
  else { pw = canvas.width; ph = canvas.height; }

  // Use a data URL approach: open in new window for printing
  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open('', '_blank');
  if (!win) { showToast('Please allow popups to export PDF'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>Export PDF</title>
    <style>@page{size:${pw}px ${ph}px;margin:0}body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:white}img{max-width:100%;max-height:100vh;object-fit:contain}</style>
    </head><body><img src="${dataUrl}"></body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

// =====================================================
// LOAD MODAL
// =====================================================
async function renderLoadModal() {
  const list = document.getElementById('displaysList');
  const empty = document.getElementById('loadsEmpty');
  list.innerHTML = '<div class="de-props-placeholder">Loading displays...</div>';
  empty.style.display = 'none';
  // Refresh from server
  if (isLoggedIn()) await loadDisplaysAsync();
  const displays = loadDisplays();
  if (displays.length === 0) { list.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  const cards = [];
  for (const d of displays) {
    let thumbUrl = '';
    try {
      if (d.pages && d.pages[0]) thumbUrl = await generateThumbnail(d.pages[0], 280, 180);
    } catch(e) { /* ignore */ }
    cards.push(`
    <div class="de-load-card" data-id="${d.id}">
      <div class="de-load-thumb">${thumbUrl ? `<img src="${thumbUrl}" alt="">` : '<div class="de-load-thumb-empty">No preview</div>'}</div>
      <div class="de-load-info">
        <div class="de-load-name">${d.name}</div>
        <div class="de-load-meta">${d.pages.length} page${d.pages.length !== 1 ? 's' : ''} · ${new Date(d.lastModified).toLocaleDateString()}</div>
      </div>
      <button class="de-load-del" data-id="${d.id}" title="Delete">×</button>
    </div>`);
  }
  list.innerHTML = cards.join('');

  list.querySelectorAll('.de-load-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('de-load-del')) return;
      loadDisplayById(card.dataset.id); loadModal.classList.remove('active');
    });
  });
  list.querySelectorAll('.de-load-del').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    await deleteDisplayById(b.dataset.id);
    await renderLoadModal();
  }));
}

function loadDisplayById(id) {
  const displays = loadDisplays();
  displayState = displays.find(d => d.id === id);
  if (displayState) {
    saveCurrentDisplay(id);
    currentPage = displayState.pages[0];
    selectedItem = null; hideItemControls();
    displayNameInput.value = displayState.name;
    historyStack = [JSON.parse(JSON.stringify(displayState))];
    historyPointer = 0;
    markClean();
    renderPage(); renderPageTabs();
  }
}

async function deleteDisplayById(id) {
  if (isLoggedIn()) {
    try { await deleteDisplayFromServer(id); } catch(e) { console.error(e); }
  }
}

// =====================================================
// TOAST NOTIFICATION
// =====================================================
function showToast(msg) {
  let t = document.getElementById('de-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'de-toast';
    t.className = 'de-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

// =====================================================
// CREATE FRESH DISPLAY
// =====================================================
async function createFreshDisplay() {
  displayState = createNewDisplay();
  currentPage = displayState.pages[0];
  selectedItem = null; hideItemControls();
  if (isLoggedIn()) {
    try { await saveDisplayToServer(displayState); } catch(e) { console.error(e); }
  }
  saveCurrentDisplay(displayState.id);
  displayNameInput.value = displayState.name;
  historyStack = [JSON.parse(JSON.stringify(displayState))];
  historyPointer = 0;
  markClean();
  renderPage(); renderPageTabs(); renderGalleryPreview();
  showToast('New display created');
}

// =====================================================
// BIND ALL EVENTS
// =====================================================
function bindAllEvents() {
  // --- Top bar buttons ---
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);

  document.getElementById('newDisplayBtn').addEventListener('click', () => {
    // Only show confirmation if there are actual unsaved changes
    if (checkDirty()) {
      document.getElementById('newConfirmModal').classList.add('active');
    } else {
      createFreshDisplay();
    }
  });

  document.getElementById('newConfirmSave').addEventListener('click', async () => {
    displayState.name = displayNameInput.value || 'Untitled Collage';
    try {
      if (isLoggedIn()) await saveDisplayToServer(displayState);
      markClean();
      showToast('Saved');
    } catch (err) {
      showToast('Save failed: ' + err.message);
    }
    document.getElementById('newConfirmModal').classList.remove('active');
    createFreshDisplay();
  });
  document.getElementById('newConfirmDiscard').addEventListener('click', () => {
    document.getElementById('newConfirmModal').classList.remove('active');
    createFreshDisplay();
  });
  document.getElementById('newConfirmCancel').addEventListener('click', () => {
    document.getElementById('newConfirmModal').classList.remove('active');
  });

  document.getElementById('saveDisplayBtn').addEventListener('click', async () => {
    displayState.name = displayNameInput.value || 'Untitled Collage';
    const btn = document.getElementById('saveDisplayBtn');
    btn.textContent = 'Saving...';
    btn.disabled = true;
    try {
      if (isLoggedIn()) await saveDisplayToServer(displayState);
      markClean();
      showToast('Display saved');
    } catch (err) {
      showToast('Save failed: ' + err.message);
    }
    btn.textContent = 'Save';
    btn.disabled = false;
  });

  document.getElementById('loadDisplayBtn').addEventListener('click', () => {
    renderLoadModal(); loadModal.classList.add('active');
  });

  document.getElementById('exportBtn').addEventListener('click', openExportModal);

  // --- Export modal ---
  const exportModal = document.getElementById('exportModal');
  if (exportModal) {
    document.getElementById('closeExportModal').addEventListener('click', () => exportModal.classList.remove('active'));
    document.getElementById('cancelExportModal').addEventListener('click', () => exportModal.classList.remove('active'));
    exportModal.addEventListener('click', e => { if (e.target === exportModal) exportModal.classList.remove('active'); });
    document.getElementById('confirmExportBtn').addEventListener('click', performExport);
    document.getElementById('exportFormat').addEventListener('change', handleExportFormatChange);
    document.getElementById('exportScale').addEventListener('change', updateExportResLabel);
    document.getElementById('exportQuality').addEventListener('input', e => {
      document.getElementById('exportQualityVal').textContent = e.target.value + '%';
    });
  }

  // --- Portfolio modal ---
  const portfolioModal = document.getElementById('portfolioModal');
  document.getElementById('saveToPortfolioBtn').addEventListener('click', async () => {
    displayState.name = displayNameInput.value || 'Untitled Collage';
    updateCurrentDisplay();
    const thumb = await generateThumbnail(currentPage);
    document.getElementById('portfolioPreview').innerHTML = `<img src="${thumb}" alt="Preview">`;
    document.getElementById('portfolioTitle').value = displayState.name;
    document.getElementById('portfolioDesc').value = '';
    portfolioModal.classList.add('active');
  });
  document.getElementById('closePortfolioModal').addEventListener('click', () => portfolioModal.classList.remove('active'));
  document.getElementById('cancelPortfolioModal').addEventListener('click', () => portfolioModal.classList.remove('active'));
  portfolioModal.addEventListener('click', e => { if (e.target === portfolioModal) portfolioModal.classList.remove('active'); });
  document.getElementById('confirmPortfolioBtn').addEventListener('click', async () => {
    const title = document.getElementById('portfolioTitle').value.trim() || displayState.name;
    const desc = document.getElementById('portfolioDesc').value.trim();
    const confirmBtn = document.getElementById('confirmPortfolioBtn');
    confirmBtn.textContent = 'Saving...';
    confirmBtn.disabled = true;
    try {
      // Render full-res image of the collage
      const fullCanvas = await renderExportCanvas(1, false);
      const fullImage = fullCanvas ? fullCanvas.toDataURL('image/png') : await generateThumbnail(currentPage);
      const item = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        displayId: displayState.id, title, description: desc, thumbnail: fullImage,
        createdAt: new Date().toISOString()
      };
      if (isLoggedIn()) {
        await savePortfolioItemToServer(item);
      }
      portfolioModal.classList.remove('active');
      showToast('Added to Portfolio');
    } catch (err) {
      showToast('Failed to save: ' + err.message);
    }
    confirmBtn.textContent = 'Add to Portfolio';
    confirmBtn.disabled = false;
  });

  // --- Load modal ---
  document.getElementById('closeLoadModal').addEventListener('click', () => loadModal.classList.remove('active'));
  document.getElementById('cancelLoadModal').addEventListener('click', () => loadModal.classList.remove('active'));
  loadModal.addEventListener('click', e => { if (e.target === loadModal) loadModal.classList.remove('active'); });

  // --- Display name input — mark dirty on change ---
  displayNameInput.addEventListener('input', () => {
    displayState.name = displayNameInput.value || 'Untitled Collage';
    markDirty();
  });

  // --- Grid toggle ---
  document.getElementById('gridSnapToggle').addEventListener('change', () => renderPage());
  document.getElementById('gridSize').addEventListener('change', () => renderPage());

  // --- Page tabs ---
  document.getElementById('addPageBtn').addEventListener('click', () => {
    pushHistory();
    const np = createNewPage();
    np.pageNumber = displayState.pages.length + 1;
    displayState.pages.push(np);
    currentPage = np; selectedItem = null; hideItemControls();
    renderPage(); renderPageTabs(); updateCurrentDisplay();
  });

  // --- Canvas size inputs ---
  const canvasWidthInput = document.getElementById('canvasWidth');
  const canvasHeightInput = document.getElementById('canvasHeight');
  const canvasPreset = document.getElementById('canvasPreset');

  function applyCanvasSize(w, h) {
    if (!currentPage) return;
    currentPage.width = Math.max(100, Math.min(7680, w));
    currentPage.height = Math.max(100, Math.min(4320, h));
    displayCanvas.style.aspectRatio = `${currentPage.width} / ${currentPage.height}`;
    updateCurrentDisplay(); renderPage(); pushHistory();
  }

  canvasWidthInput.addEventListener('change', () => {
    applyCanvasSize(parseInt(canvasWidthInput.value) || 1920, currentPage.height);
  });
  canvasHeightInput.addEventListener('change', () => {
    applyCanvasSize(currentPage.width, parseInt(canvasHeightInput.value) || 1080);
  });
  canvasPreset.addEventListener('change', () => {
    const val = canvasPreset.value;
    if (!val) return;
    if (val === 'screen') {
      const size = getDefaultCanvasSize();
      canvasWidthInput.value = size.width;
      canvasHeightInput.value = size.height;
      applyCanvasSize(size.width, size.height);
    } else {
      const [w, h] = val.split('x').map(Number);
      canvasWidthInput.value = w;
      canvasHeightInput.value = h;
      applyCanvasSize(w, h);
    }
  });

  // --- Canvas background ---
  document.getElementById('canvasBgColor').addEventListener('input', e => {
    if (currentPage) {
      currentPage.background = e.target.value;
      displayCanvas.style.background = e.target.value;
      updateCurrentDisplay(); pushHistory();
    }
  });

  // --- Property sliders (debounced history push) ---
  const debouncedHistory = debounce(() => pushHistory(), 300);

  bindSlider('rotateSlider', 'rotateValue', v => {
    if (!selectedItem) return;
    selectedItem.rotation = v;
    updateItemInPage(selectedItem); renderPage(); debouncedHistory();
  });

  bindSlider('opacitySlider', 'opacityValue', v => {
    if (!selectedItem) return;
    selectedItem.opacity = v;
    updateItemInPage(selectedItem); renderPage(); debouncedHistory();
  });

  bindSlider('radiusSlider', 'radiusValue', v => {
    if (!selectedItem) return;
    selectedItem.borderRadius = v;
    updateItemInPage(selectedItem); renderPage(); debouncedHistory();
  });

  // --- Filter sliders (debounced) ---
  bindSlider('brightnessSlider', 'brightnessValue', v => { if (!selectedItem) return; selectedItem.brightness = v; updateItemInPage(selectedItem); renderPage(); debouncedHistory(); });
  bindSlider('contrastSlider', 'contrastValue', v => { if (!selectedItem) return; selectedItem.contrast = v; updateItemInPage(selectedItem); renderPage(); debouncedHistory(); });
  bindSlider('saturateSlider', 'saturateValue', v => { if (!selectedItem) return; selectedItem.saturate = v; updateItemInPage(selectedItem); renderPage(); debouncedHistory(); });
  bindSlider('grayscaleSlider', 'grayscaleValue', v => { if (!selectedItem) return; selectedItem.grayscale = v; updateItemInPage(selectedItem); renderPage(); debouncedHistory(); });
  bindSlider('blurSlider', 'blurValue', v => { if (!selectedItem) return; selectedItem.blur = v; updateItemInPage(selectedItem); renderPage(); debouncedHistory(); });

  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    if (!selectedItem) return;
    selectedItem.brightness = 100; selectedItem.contrast = 100;
    selectedItem.saturate = 100; selectedItem.grayscale = 0; selectedItem.blur = 0;
    updateItemInPage(selectedItem); renderPage(); showItemControls(); pushHistory();
  });

  // --- Property inputs (position/size) ---
  ['posX','posY','sizeW','sizeH'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      if (!selectedItem) return;
      selectedItem.x = parseInt(document.getElementById('posX').value) || 0;
      selectedItem.y = parseInt(document.getElementById('posY').value) || 0;
      selectedItem.width = Math.max(30, parseInt(document.getElementById('sizeW').value) || 30);
      selectedItem.height = Math.max(30, parseInt(document.getElementById('sizeH').value) || 30);
      updateItemInPage(selectedItem); renderPage(); pushHistory();
    });
  });

  // --- Layer actions ---
  document.getElementById('bringFrontBtn').addEventListener('click', () => {
    if (!selectedItem) return;
    selectedItem.zIndex = Math.max(0, ...currentPage.items.map(i => i.zIndex||0)) + 1;
    updateItemInPage(selectedItem); renderPage(); pushHistory();
  });
  document.getElementById('sendBackBtn').addEventListener('click', () => {
    if (!selectedItem) return;
    const otherItems = currentPage.items.filter(i => i.id !== selectedItem.id);
    const currentZ = selectedItem.zIndex || 0;
    const belowZ = otherItems.map(i => i.zIndex || 0).filter(z => z < currentZ);
    if (belowZ.length > 0) {
      const targetZ = Math.max(...belowZ);
      selectedItem.zIndex = targetZ;
      // Push the item that was at targetZ down by 1
      otherItems.forEach(i => { if ((i.zIndex || 0) === targetZ) { i.zIndex = targetZ - 1; updateItemInPage(i); } });
    } else {
      selectedItem.zIndex = Math.max(currentZ - 1, 0);
    }
    updateItemInPage(selectedItem); renderPage(); pushHistory();
  });
  document.getElementById('flipHBtn').addEventListener('click', () => {
    if (!selectedItem) return;
    selectedItem.flipH = !selectedItem.flipH;
    updateItemInPage(selectedItem); renderPage(); pushHistory();
  });
  document.getElementById('flipVBtn').addEventListener('click', () => {
    if (!selectedItem) return;
    selectedItem.flipV = !selectedItem.flipV;
    updateItemInPage(selectedItem); renderPage(); pushHistory();
  });
  document.getElementById('deleteItemBtn').addEventListener('click', () => {
    if (!selectedItem) return;
    pushHistory();
    currentPage.items = currentPage.items.filter(i => i.id !== selectedItem.id);
    selectedItem = null; hideItemControls();
    renderPage(); updateCurrentDisplay();
  });

  // --- Crop ---
  const cropModal = document.getElementById('cropModal');
  let cropState = { sx: 0, sy: 0, sw: 0, sh: 0, dragging: false, startX: 0, startY: 0 };

  document.getElementById('cropItemBtn').addEventListener('click', () => {
    if (!selectedItem || selectedItem.type !== 'image') return;
    const img = document.getElementById('cropImage');
    img.src = selectedItem.src;
    const box = document.getElementById('cropBox');
    img.onload = () => {
      const cont = document.getElementById('cropContainer');
      const cw = cont.clientWidth, ch = cont.clientHeight;
      const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      img.style.width = dw + 'px'; img.style.height = dh + 'px';
      box.style.left = '10%'; box.style.top = '10%'; box.style.width = '80%'; box.style.height = '80%';
      cropState = { sx: 0.1, sy: 0.1, sw: 0.8, sh: 0.8, dragging: false };
    };
    cropModal.classList.add('active');
  });

  document.getElementById('closeCropModal').addEventListener('click', () => cropModal.classList.remove('active'));
  document.getElementById('cancelCropModal').addEventListener('click', () => cropModal.classList.remove('active'));
  cropModal.addEventListener('click', e => { if (e.target === cropModal) cropModal.classList.remove('active'); });

  // Drag crop box
  const cropBox = document.getElementById('cropBox');
  cropBox.addEventListener('mousedown', e => {
    cropState.dragging = true;
    cropState.startX = e.clientX;
    cropState.startY = e.clientY;
    cropState.origLeft = parseFloat(cropBox.style.left) || 10;
    cropState.origTop = parseFloat(cropBox.style.top) || 10;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!cropState.dragging) return;
    const cont = document.getElementById('cropContainer');
    const cw = cont.clientWidth, ch = cont.clientHeight;
    const dx = ((e.clientX - cropState.startX) / cw) * 100;
    const dy = ((e.clientY - cropState.startY) / ch) * 100;
    const nl = Math.max(0, Math.min(100 - parseFloat(cropBox.style.width), cropState.origLeft + dx));
    const nt = Math.max(0, Math.min(100 - parseFloat(cropBox.style.height), cropState.origTop + dy));
    cropBox.style.left = nl + '%';
    cropBox.style.top = nt + '%';
  });
  document.addEventListener('mouseup', () => { cropState.dragging = false; });

  document.getElementById('confirmCropBtn').addEventListener('click', () => {
    if (!selectedItem) { cropModal.classList.remove('active'); return; }
    const img = document.getElementById('cropImage');
    const cont = document.getElementById('cropContainer');
    const box = document.getElementById('cropBox');
    const cw = cont.clientWidth, ch = cont.clientHeight;
    const imgEl = cont.querySelector('img');
    const iw = imgEl.clientWidth, ih = imgEl.clientHeight;
    const offsetX = (cw - iw) / 2, offsetY = (ch - ih) / 2;

    const bx = (parseFloat(box.style.left) / 100) * cw - offsetX;
    const by = (parseFloat(box.style.top) / 100) * ch - offsetY;
    const bw = (parseFloat(box.style.width) / 100) * cw;
    const bh = (parseFloat(box.style.height) / 100) * ch;

    const scaleX = img.naturalWidth / iw;
    const scaleY = img.naturalHeight / ih;
    const sx = Math.max(0, bx * scaleX), sy = Math.max(0, by * scaleY);
    const sw = Math.min(img.naturalWidth - sx, bw * scaleX);
    const sh = Math.min(img.naturalHeight - sy, bh * scaleY);

    const c = document.createElement('canvas');
    c.width = Math.round(sw); c.height = Math.round(sh);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    pushHistory();
    selectedItem.src = c.toDataURL('image/png');
    const aspect = sw / sh;
    selectedItem.width = Math.round(selectedItem.height * aspect);
    updateItemInPage(selectedItem);
    renderPage(); updateCurrentDisplay();
    cropModal.classList.remove('active');
    showToast('Image cropped');
  });

  // --- Upload area (right panel) ---
  const uploadArea = document.getElementById('uploadArea');
  const photoFileInput = document.getElementById('photoFileInput');
  uploadArea.addEventListener('click', e => {
    if (e.target === photoFileInput) return;
    photoFileInput.click();
  });
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', async e => {
    e.preventDefault(); uploadArea.classList.remove('dragover');
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await fileToDataURL(file);
        addPhotoToCanvas(dataUrl);
      }
    }
  });
  photoFileInput.addEventListener('change', async e => {
    for (const file of e.target.files) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await fileToDataURL(file);
        addPhotoToCanvas(dataUrl);
      }
    }
    photoFileInput.value = '';
  });

  // --- Canvas workspace resize (visual only, not export resolution) ---
  let canvasResizing = false, canvasResizeCorner = '', canvasResizeStartX = 0, canvasResizeStartW = 0;
  const canvasOuter = document.getElementById('canvasOuter');
  document.querySelectorAll('.de-canvas-resize').forEach(handle => {
    handle.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      canvasResizing = true;
      canvasResizeCorner = handle.dataset.corner;
      canvasResizeStartX = e.clientX;
      canvasResizeStartW = displayCanvas.offsetWidth;
    });
  });
  document.addEventListener('mousemove', e => {
    if (!canvasResizing) return;
    const dx = e.clientX - canvasResizeStartX;
    const sign = (canvasResizeCorner === 'se' || canvasResizeCorner === 'ne') ? 1 : -1;
    const newW = Math.max(300, Math.min(2400, canvasResizeStartW + dx * sign * 2));
    displayCanvas.style.maxWidth = newW + 'px';
    displayCanvas.style.minWidth = newW + 'px';
  });
  document.addEventListener('mouseup', () => { canvasResizing = false; });

  // --- Canvas click to deselect ---
  displayCanvas.addEventListener('click', e => {
    if (e.target === displayCanvas) deselectItem();
  });

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') deselectItem();
    else if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); document.getElementById('saveDisplayBtn').click(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItem && document.activeElement.tagName !== 'INPUT') {
      document.getElementById('deleteItemBtn').click();
    }
  });
}

// --- Slider helper ---
function bindSlider(sliderId, valueId, onChange) {
  const slider = document.getElementById(sliderId);
  const display = document.getElementById(valueId);
  slider.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    display.textContent = v;
    onChange(v);
  });
}

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', initializeDisplay);
