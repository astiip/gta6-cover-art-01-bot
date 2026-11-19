// Fixed scenes for screenshots: ?shot=editor shows the page with the sample
// photos loaded; ?shot=cover shows the exported cover alone, at the size the
// `size` query names (1920x1080, 1080x1080 or 1080x1350). window.__shotReady
// is set once the cover has been painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load(query.get('size') ?? '1920x1080');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
