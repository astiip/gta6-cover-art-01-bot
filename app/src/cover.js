// Neon Palms — the cover renderer. Draws the whole multi-panel GTA-style poster
// onto any 2D canvas: six photo panels with a sunset/neon grade, one giant
// gradient title with a script subtitle, a star quote strip, a tagline pill,
// a gold "ORIGINAL COVER ART" seal, a barcode and a footer. Every size is a
// fraction of the canvas, so the same drawing works at 1920x1080, 1080x1080
// and 1080x1350. No Rockstar logo, artwork or font is used anywhere here.

export const PANEL_LABELS = [
  'THE DRIVER',
  'THE FIXER',
  'TOWER 5',
  'OCEAN DRIVE',
  'PIER 26',
  'PALM ROW',
];

export const GRADES = {
  sunset: {
    top: 'rgba(255, 64, 160, 0.16)',
    bottom: 'rgba(255, 140, 40, 0.34)',
    wash: 'rgba(255, 110, 60, 0.10)',
  },
  neon: {
    top: 'rgba(0, 229, 255, 0.20)',
    bottom: 'rgba(255, 0, 170, 0.34)',
    wash: 'rgba(150, 40, 255, 0.12)',
  },
  dusk: {
    top: 'rgba(60, 20, 140, 0.30)',
    bottom: 'rgba(255, 80, 120, 0.26)',
    wash: 'rgba(40, 10, 90, 0.16)',
  },
};

/** The six panel rectangles (row-major) for a cover of size w x h. */
export function panelRects(w, h) {
  const m = Math.round(w * 0.016);
  const gap = Math.round(w * 0.008);
  const top = Math.round(h * 0.062);
  const bottom = Math.round(h * 0.878);
  const gw = w - m * 2 - gap * 2;
  const gh = bottom - top;
  const cols = [0.315, 0.37, 0.315];
  const rh = (gh - gap) / 2;
  const rects = [];
  for (let r = 0; r < 2; r += 1) {
    let x = m;
    for (let c = 0; c < 3; c += 1) {
      const cw = gw * cols[c];
      rects.push({
        x: Math.round(x),
        y: Math.round(top + r * (rh + gap)),
        w: Math.round(cw),
        h: Math.round(rh),
      });
      x += cw + gap;
    }
  }
  return rects;
}

/** Draws one photo into a panel rect, object-fit cover, with the panel's crop. */
export function drawPanelPhoto(ctx, photo, rect, crop, grade) {
  if (!photo) return;
  const { zoom = 1, ox = 0, oy = 0 } = crop || {};
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w * 0.4;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h * 0.4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  const g = GRADES[grade] || GRADES.sunset;
  const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  tint.addColorStop(0, g.top);
  tint.addColorStop(1, g.bottom);
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = g.wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // A soft vignette so the panels read as one poster, not six loose photos.
  const vig = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.42,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,0,30,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** A black label chip with a pink edge and white bold text. Top-row panels get
 * it at the top-left; bottom-row panels at the bottom-left, because the giant
 * title crosses the seam between the rows and would cover it otherwise. */
export function drawPanelLabel(ctx, rect, text, atBottom) {
  if (!text) return;
  const pad = Math.max(6, rect.w * 0.018);
  ctx.font = `800 ${Math.max(11, Math.round(rect.w * 0.042))}px "Arial Black", "Noto Sans", sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + pad * 2.4;
  const bh = pad * 2.6;
  const bx = rect.x + Math.max(4, rect.w * 0.02);
  const by = atBottom
    ? rect.y + rect.h - bh - Math.max(4, rect.h * 0.035)
    : rect.y + Math.max(4, rect.h * 0.035);
  ctx.save();
  ctx.fillStyle = 'rgba(8, 2, 18, 0.92)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(bx, by, Math.max(3, rect.w * 0.012), bh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + pad * 1.5, by + bh / 2 + 1);
  ctx.restore();
}

/** The giant gradient title, fitted to the canvas width, slightly condensed. */
export function drawGiantTitle(ctx, w, h, title) {
  const words = title.trim().toUpperCase() || 'NEON PALMS';
  const cy = h * 0.475;
  let size = w * 0.148;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fit = (s) => {
    ctx.font = `900 ${s}px "Arial Black", "Noto Sans", sans-serif`;
    return ctx.measureText(words).width * 0.84;
  };
  while (fit(size) > w * 0.97 && size > 20) size -= 4;
  ctx.translate(w / 2, cy);
  ctx.scale(0.84, 1);
  ctx.font = `900 ${size}px "Arial Black", "Noto Sans", sans-serif`;
  const grad = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
  grad.addColorStop(0, '#fff7ae');
  grad.addColorStop(0.42, '#ffb347');
  grad.addColorStop(0.72, '#ff5e8a');
  grad.addColorStop(1, '#c81d7e');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2a0a4a';
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(words, 0, 0);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.045;
  ctx.strokeText(words, 0, 0);
  ctx.shadowColor = 'rgba(255, 46, 136, 0.9)';
  ctx.shadowBlur = size * 0.22;
  ctx.fillStyle = grad;
  ctx.fillText(words, 0, 0);
  ctx.restore();
  return size;
}

/** The pink script-style subtitle, overlapping the foot of the title. */
export function drawScriptSubtitle(ctx, w, h, subtitle, titleSize) {
  const text = subtitle.trim() || 'chasing the last sunset';
  const y = h * 0.475 + titleSize * 0.52 + h * 0.03;
  let size = w * 0.052;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 700 ${size}px Georgia, "Times New Roman", serif`;
  while (ctx.measureText(text).width > w * 0.82 && size > 14) {
    size -= 2;
    ctx.font = `italic 700 ${size}px Georgia, "Times New Roman", serif`;
  }
  ctx.shadowColor = 'rgba(255, 46, 136, 1)';
  ctx.shadowBlur = size * 0.55;
  ctx.fillStyle = '#ff9ecf';
  ctx.fillText(text, w / 2, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd7ec';
  ctx.fillText(text, w / 2, y);
  ctx.restore();
  return y + size * 0.7;
}

/** A barcode drawn from a fixed seed, so every export matches. */
export function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 16);
  ctx.fillStyle = '#111111';
  let bx = x;
  let seed = 20261120;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  while (bx < x + w - 3) {
    const bw = 1 + Math.floor(next() * 4);
    if (next() > 0.42) ctx.fillRect(bx, y, bw, h);
    bx += bw + 1 + Math.floor(next() * 3);
  }
  ctx.font = `700 ${Math.max(9, Math.round(h * 0.22))}px "Noto Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('0 21120 62620 8', x + w / 2, y + h + 12);
  ctx.restore();
}

/** The gold starburst seal in the bottom-right corner. */
export function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i += 1) {
    const ang = (i * Math.PI) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.86;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffc21c';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = '#7a4d00';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe9a8';
  ctx.fill();
  ctx.fillStyle = '#3a2400';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${r * 0.26}px "Arial Black", "Noto Sans", sans-serif`;
  ctx.fillText('ORIGINAL', 0, -r * 0.22);
  ctx.fillText('COVER ART', 0, r * 0.06);
  ctx.font = `${r * 0.22}px "Noto Sans", sans-serif`;
  ctx.fillText('★ ★ ★', 0, r * 0.36);
  ctx.restore();
}

/**
 * Draws the full cover. `photos` is an array of 6 images (or nulls),
 * `crops` an array of 6 {zoom, ox, oy}, `text` holds title, subtitle,
 * tagline, quote and the 6 panel labels, `grade` is sunset | neon | dusk.
 */
export function drawCover(canvas, photos, crops, text, grade) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const m = Math.round(w * 0.016);

  ctx.fillStyle = '#1c0b33';
  ctx.fillRect(0, 0, w, h);
  // Warm sunset wash behind the whole poster.
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, 'rgba(255, 90, 160, 0.20)');
  wash.addColorStop(0.5, 'rgba(255, 140, 60, 0.10)');
  wash.addColorStop(1, 'rgba(60, 10, 120, 0.28)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // Header: five stars + quote on the left, VOL badge on the right.
  const hy = h * 0.036;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `800 ${Math.max(12, Math.round(w * 0.016))}px "Noto Sans", sans-serif`;
  ctx.fillStyle = '#ffc21c';
  ctx.fillText('★ ★ ★ ★ ★', m, hy);
  const starsW = ctx.measureText('★ ★ ★ ★ ★  ').width;
  ctx.fillStyle = '#ffe9f4';
  ctx.font = `700 ${Math.max(11, Math.round(w * 0.0145))}px "Noto Sans", sans-serif`;
  ctx.fillText(`"${(text.quote || '').toUpperCase()}"  —  THE VICE HERALD`, m + starsW, hy);
  const vol = 'VOL. 2';
  ctx.font = `900 ${Math.max(12, Math.round(w * 0.017))}px "Arial Black", "Noto Sans", sans-serif`;
  const vw = ctx.measureText(vol).width + w * 0.03;
  const vh = h * 0.038;
  ctx.fillStyle = '#ffc21c';
  ctx.fillRect(w - m - vw, hy - vh / 2, vw, vh);
  ctx.fillStyle = '#2a0a4a';
  ctx.textAlign = 'center';
  ctx.fillText(vol, w - m - vw / 2, hy + 1);

  // Six photo panels with the grade and their label chips.
  const rects = panelRects(w, h);
  rects.forEach((rect, i) => {
    drawPanelPhoto(ctx, photos[i], rect, crops[i], grade);
    ctx.save();
    ctx.strokeStyle = '#ffe9f4';
    ctx.lineWidth = Math.max(2, w * 0.0022);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    drawPanelLabel(ctx, rect, text.labels[i] || PANEL_LABELS[i], i >= 3);
  });

  // The giant title, the script subtitle under it, and the tagline pill.
  const titleSize = drawGiantTitle(ctx, w, h, text.title);
  const subBottom = drawScriptSubtitle(ctx, w, h, text.subtitle, titleSize);
  const tag = (text.tagline || '').toUpperCase();
  if (tag) {
    ctx.save();
    ctx.font = `800 ${Math.max(11, Math.round(w * 0.016))}px "Noto Sans", sans-serif`;
    const tw = ctx.measureText(tag).width;
    const ty = subBottom + h * 0.012;
    const th = h * 0.038;
    const tx = (w - tw) / 2 - w * 0.014;
    ctx.fillStyle = 'rgba(8, 2, 18, 0.92)';
    ctx.fillRect(tx, ty, tw + w * 0.028, th);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(tx, ty, Math.max(3, w * 0.006), th);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, w / 2, ty + th / 2 + 1);
    ctx.restore();
  }

  // Footer: COMING SOON, production line, barcode, gold seal.
  const fy = h * 0.93;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.max(12, Math.round(w * 0.02))}px "Arial Black", "Noto Sans", sans-serif`;
  ctx.fillStyle = '#ff5ea8';
  ctx.shadowColor = 'rgba(255, 46, 136, 0.9)';
  ctx.shadowBlur = Math.max(4, w * 0.008);
  ctx.fillText('COMING SOON', m, fy);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.max(10, Math.round(w * 0.0115))}px "Noto Sans", sans-serif`;
  ctx.fillStyle = '#e8d5f2';
  ctx.fillText('A SUNSET PICTURES PRODUCTION  ·  STARRING YOU  ·  SHOT ON YOUR OWN CAMERA  ·  GRADED BY HAND', w / 2, fy);
  ctx.restore();
  const bw = w * 0.075;
  const bh = h * 0.032;
  drawBarcode(ctx, w - m - bw, fy - bh / 2, bw, bh);
  drawSeal(ctx, w - m - bw - w * 0.055, h * 0.845, Math.min(w, h) * 0.058);

  // Thin inner frame, the poster's finishing edge.
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 233, 244, 0.85)';
  ctx.lineWidth = Math.max(2, w * 0.0016);
  ctx.strokeRect(m / 2, h * 0.008, w - m, h * 0.984);
  ctx.restore();
}
