/**
 * Side panel / landing / UI for Terra Pantry.
 */

let panelEl;
let contentEl;
let titleEl;
let closeBtn;
let overlayHint;
let onCloseCb = null;

export function initUI({ onClose } = {}) {
  onCloseCb = onClose ?? null;
  panelEl = document.getElementById('region-panel');
  contentEl = document.getElementById('panel-content');
  titleEl = document.getElementById('panel-title');
  closeBtn = document.getElementById('panel-close');
  overlayHint = document.getElementById('controls-hint');

  closeBtn?.addEventListener('click', () => hidePanel());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePanel();
  });
}

export function showRegion(region) {
  if (!panelEl || !region) return;

  titleEl.textContent = region.name;

  const climate = region.climate || {};
  const food = region.food || {};
  const ingredients = (food.ingredients || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('');
  const dishes = (food.dishes || []).map((d) => `<span class="chip">${escapeHtml(d)}</span>`).join('');

  contentEl.innerHTML = `
    <section class="panel-section">
      <h3 class="section-label">Climate</h3>
      <dl class="fact-list">
        <div><dt>Köppen-ish</dt><dd>${escapeHtml(climate.koppen || '—')}</dd></div>
        <div><dt>Summer</dt><dd>${escapeHtml(climate.summerTemp || '—')}</dd></div>
        <div><dt>Winter</dt><dd>${escapeHtml(climate.winterTemp || '—')}</dd></div>
        <div><dt>Rainfall</dt><dd>${escapeHtml(climate.rainfall || '—')}</dd></div>
      </dl>
    </section>
    <section class="panel-section">
      <h3 class="section-label">Food &amp; pantry</h3>
      <p class="ag-note">${escapeHtml(food.agriculture || '')}</p>
      <h4 class="sub-label">Signature ingredients</h4>
      <ul class="ingredient-list">${ingredients}</ul>
      <h4 class="sub-label">Dishes</h4>
      <div class="chip-row">${dishes}</div>
    </section>
  `;

  panelEl.classList.add('open');
  panelEl.setAttribute('aria-hidden', 'false');
  overlayHint?.classList.add('dimmed');
}

export function hidePanel() {
  if (!panelEl) return;
  panelEl.classList.remove('open');
  panelEl.setAttribute('aria-hidden', 'true');
  overlayHint?.classList.remove('dimmed');
  onCloseCb?.();
}

export function setHoverLabel(name) {
  const el = document.getElementById('hover-label');
  if (!el) return;
  if (name) {
    el.textContent = name;
    el.classList.add('visible');
  } else {
    el.classList.remove('visible');
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
