import { request } from './api.js';
import { PLATFORMS } from './constants.js';
import { escapeHtml } from './utils.js';
import { getCachedUser } from './auth.js';

const statusEl = document.getElementById('statsStatus');
const body = document.getElementById('statsBody');
const totalEl = document.getElementById('statsTotal');
const platformsEl = document.getElementById('statsPlatforms');
const rowsEl = document.getElementById('statsRows');
const refreshBtn = document.getElementById('statsRefresh');

const platformKeys = Object.keys(PLATFORMS);   // ['shopee', 'lazada', 'tiktok']
let latest = 0;                                // "latest request wins", as in app.js

// Loading / error message. textContent only, so server messages can't become HTML.
function setStatus(text, canRetry = false) {
  statusEl.replaceChildren();
  if (!text) { statusEl.hidden = true; return; }

  const message = document.createElement('p');
  message.textContent = text;
  statusEl.append(message);

  if (canRetry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--ghost btn--small';
    button.textContent = 'Try again';
    button.addEventListener('click', load);
    statusEl.append(button);
  }
  statusEl.hidden = false;
}

function draw(data) {
  totalEl.textContent = data.totalClicks;

  // One horizontal bar per platform, sized by its share of all clicks.
  platformsEl.innerHTML = platformKeys.map((key) => {
    const count = data.byPlatform[key] ?? 0;
    const percent = data.totalClicks ? Math.round((count / data.totalClicks) * 100) : 0;
    return `
      <li class="bar">
        <span class="bar__label">${escapeHtml(PLATFORMS[key])}</span>
        <span class="bar__track"><span class="bar__fill" data-platform="${key}" style="width:${percent}%"></span></span>
        <span class="bar__count">${count}</span>
      </li>`;
  }).join('');

  // One row per product. "–" means the product has no link on that platform.
  rowsEl.innerHTML = data.products.length === 0
    ? '<tr><td colspan="5" class="stats__empty">Post a recommendation to start tracking clicks.</td></tr>'
    : data.products.map((product) => `
        <tr>
          <td><strong>${escapeHtml(product.name)}</strong><br><span class="stats__brand">${escapeHtml(product.brand)}</span></td>
          ${platformKeys.map((key) =>
            `<td>${product.platforms.includes(key) ? product.byPlatform[key] : '–'}</td>`).join('')}
          <td><strong>${product.total}</strong></td>
        </tr>`).join('');
}

async function load() {
  if (!getCachedUser()) return;   // the panel is only visible when logged in anyway

  const mine = ++latest;
  setStatus('Loading…');
  body.hidden = true;

  try {
    const { data } = await request('GET', '/stats/links');
    if (mine !== latest) return;
    draw(data);
    setStatus('');
    body.hidden = false;
  } catch (error) {
    if (mine !== latest) return;
    setStatus(error.message, true);
  }
}

refreshBtn.addEventListener('click', load);
document.addEventListener('auth:changed', load);      // login, logout, profile change
document.addEventListener('catalog:changed', load);   // a recommendation was added or removed
// Numbers may have changed since you last looked, so refresh whenever Profile is opened.
window.addEventListener('hashchange', () => {
  if (location.hash === '#profile') load();
});