// Palm Light — wires the editor: six photo panels with per-panel crop, editable
// words, three sunset/neon grades and three export sizes, with a live preview.
// Photos stay on the user's own machine: picked files are read locally and
// never uploaded. A `?shot=` query sets up a fixed scene for a screenshot.
import { drawCover, panelRects, PANEL_LABELS } from './cover.js';
import { runShot } from './shots.js';

export const SAMPLES = [
  'convertible.jpg',
  'neonman.jpg',
  'lifeguard.jpg',
  'boulevard-night.jpg',
  'pier.jpg',
  'boulevard.jpg',
];

export const SIZES = {
  '1920x1080': [1920, 1080],
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
};

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = {
  photos: [null, null, null, null, null, null],
  crops: Array.from({ length: 6 }, () => ({ zoom: 1, ox: 0, oy: 0 })),
  labels: [...PANEL_LABELS],
  title: 'PALM LIGHT',
  subtitle: 'golden hour, every hour',
  tagline: 'SIX FRAMES · ONE CITY · NO CURFEW',
  quote: 'A COASTLINE FULL OF TROUBLE',
  grade: 'sunset',
  size: '1920x1080',
  selected: 0,
};

function textState() {
  return {
    title: state.title,
    subtitle: state.subtitle,
    tagline: state.tagline,
    quote: state.quote,
    labels: state.labels,
  };
}

/** Redraws the live preview at the currently chosen export size. */
export function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state.photos, state.crops, textState(), state.grade);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads the six bundled sample photos into the six panels. */
export async function loadSamples() {
  const loaded = await Promise.all(SAMPLES.map((name) => loadImage(`samples/${name}`)));
  state.photos = loaded;
  state.crops = Array.from({ length: 6 }, () => ({ zoom: 1, ox: 0, oy: 0 }));
  redraw();
}

/** Reads one picked file into an image element. */
export function readPickedFile(file) {
  return loadImage(URL.createObjectURL(file));
}

function syncPanelControls() {
  const i = state.selected;
  document.getElementById('panelLabel').value = state.labels[i];
  document.getElementById('zoom').value = String(state.crops[i].zoom);
  document.getElementById('offx').value = String(state.crops[i].ox);
  document.getElementById('offy').value = String(state.crops[i].oy);
  document.querySelectorAll('#panelPicker button').forEach((btn, n) => {
    btn.classList.toggle('selected', n === i);
  });
}

/** Selects panel `i` for cropping and labelling, and refreshes its controls. */
export function selectPanel(i) {
  state.selected = i;
  syncPanelControls();
}

function buildPanelPicker() {
  const picker = document.getElementById('panelPicker');
  state.labels.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${i + 1} · ${label}`;
    btn.addEventListener('click', () => selectPanel(i));
    picker.appendChild(btn);
  });
  syncPanelControls();
}

function wireWords() {
  const bind = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      redraw();
    });
  };
  bind('title', 'title');
  bind('subtitle', 'subtitle');
  bind('tagline', 'tagline');
  bind('quote', 'quote');
  document.getElementById('panelLabel').addEventListener('input', (e) => {
    state.labels[state.selected] = e.target.value.toUpperCase();
    const btn = document.querySelectorAll('#panelPicker button')[state.selected];
    if (btn) btn.textContent = `${state.selected + 1} · ${state.labels[state.selected]}`;
    redraw();
  });
}

function wireCrop() {
  document.getElementById('zoom').addEventListener('input', (e) => {
    state.crops[state.selected].zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById('offx').addEventListener('input', (e) => {
    state.crops[state.selected].ox = Number(e.target.value);
    redraw();
  });
  document.getElementById('offy').addEventListener('input', (e) => {
    state.crops[state.selected].oy = Number(e.target.value);
    redraw();
  });
}

function wirePhotos() {
  document.getElementById('photoAll').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = await readPickedFile(file);
    state.photos = state.photos.map(() => img);
    state.crops = Array.from({ length: 6 }, () => ({ zoom: 1, ox: 0, oy: 0 }));
    redraw();
    status.textContent = 'One photo now fills all six panels — crop each one below.';
  });
  document.getElementById('photoOne').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos[state.selected] = await readPickedFile(file);
    state.crops[state.selected] = { zoom: 1, ox: 0, oy: 0 };
    redraw();
    status.textContent = `Panel ${state.selected + 1} replaced with your photo.`;
  });
  document.getElementById('samples').addEventListener('click', async () => {
    await loadSamples();
    status.textContent = 'Sample set loaded — six photos, ready to remix.';
  });
  document.getElementById('clearPhotos').addEventListener('click', () => {
    state.photos = [null, null, null, null, null, null];
    redraw();
    status.textContent = 'Panels cleared. Pick a photo to fill them.';
  });
}

function wireGradeAndSize() {
  document.getElementById('grades').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-grade]');
    if (!btn) return;
    state.grade = btn.dataset.grade;
    document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
  document.querySelectorAll('input[name="size"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      state.size = radio.value;
      redraw();
    });
  });
}

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportPng() {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state.photos, state.crops, textState(), state.grade);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `palm-light-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved palm-light-${w}x${h}.png — post it.`;
  }, 'image/png');
}

/** Drag on the preview to pan the photo under the pointer; scroll to zoom it. */
function wireCanvasDrag() {
  let dragging = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };
  const panelAt = (p) => panelRects(canvas.width, canvas.height)
    .findIndex((rect) => p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h);
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const i = panelAt(p);
    if (i < 0) return;
    selectPanel(i);
    dragging = { x: p.x, y: p.y, ox: state.crops[i].ox, oy: state.crops[i].oy };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = toCanvas(e);
    const rect = panelRects(canvas.width, canvas.height)[state.selected];
    state.crops[state.selected].ox = Math.max(-1, Math.min(1, dragging.ox + (p.x - dragging.x) / rect.w / 0.4));
    state.crops[state.selected].oy = Math.max(-1, Math.min(1, dragging.oy + (p.y - dragging.y) / rect.h / 0.4));
    syncPanelControls();
    redraw();
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = toCanvas(e);
    const i = panelAt(p);
    if (i < 0) return;
    selectPanel(i);
    const crop = state.crops[i];
    crop.zoom = Math.max(1, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    syncPanelControls();
    redraw();
  }, { passive: false });
}

buildPanelPicker();
wireWords();
wireCrop();
wirePhotos();
wireGradeAndSize();
wireCanvasDrag();
document.getElementById('export').addEventListener('click', exportPng);

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (size) => {
    if (size && SIZES[size]) state.size = size;
    await loadSamples();
    status.textContent = 'Sample cover ready.';
  });
} else {
  loadSamples().then(() => {
    status.textContent = 'Sample set loaded — edit the words, swap a photo, export.';
  });
}
