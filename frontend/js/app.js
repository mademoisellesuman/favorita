import { PLATFORMS, MAX_LINKS } from './constants.js';
import { fetchProducts, fetchBrands, fetchUsers } from './productsApi.js';
import { favorites, cart } from './saved.js';
import { getCachedUser } from './auth.js';
import { escapeHtml, safeUrl, formatPrice, formatMonth, toneFor } from './utils.js';
import { showToast } from './toast.js';
import { initProfile } from './profile.js';
import './recommend.js';   // runs on import: it attaches its own listeners
import { goUrl } from './config.js';
import './stats.js';   // runs on import: it attaches its own listeners

const PAGE_SIZE = 12;

/* ---------- 1. State ---------- */
const state = { category: 'all', sort: 'newest' };
const search = { query: '', category: 'all', brand: 'all', platform: 'all' };
let savedError = '';   // set when favorites/cart could not be loaded

/* ---------- 2. Elements ---------- */
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('[data-view]');

const productGrid = document.getElementById('productGrid');
const homeStatus = document.getElementById('homeStatus');
const emptyMessage = document.getElementById('emptyMessage');
const homeMore = document.getElementById('homeMore');
const filtersBox = document.getElementById('filters');
const sortSelect = document.getElementById('sortSelect');

const favoritesGrid = document.getElementById('favoritesGrid');
const favoritesEmpty = document.getElementById('favoritesEmpty');
const favoritesStatus = document.getElementById('favoritesStatus');

const cartLayout = document.getElementById('cartLayout');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartStatus = document.getElementById('cartStatus');

const favBadge = document.getElementById('favCount');
const cartBadge = document.getElementById('cartCount');

const searchInput = document.getElementById('searchInput');
const searchCategory = document.getElementById('searchCategory');
const searchBrand = document.getElementById('searchBrand');
const searchPlatform = document.getElementById('searchPlatform');
const searchPeopleBox = document.getElementById('searchPeopleBox');
const searchUsers = document.getElementById('searchUsers');
const searchSummary = document.getElementById('searchSummary');
const searchGrid = document.getElementById('searchGrid');
const searchStatus = document.getElementById('searchStatus');
const searchEmpty = document.getElementById('searchEmpty');
const searchMore = document.getElementById('searchMore');

/* ---------- 3. Helpers ---------- */
const goToProfile = () => { location.hash = '#profile'; };

const debounce = (fn, ms) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
};

// A message area with an optional button ("Try again", "Go to Profile").
// Built with createElement/textContent, so server messages can never become HTML.
function showStatus(element, text, action) {
  element.replaceChildren();
  if (!text) { element.hidden = true; return; }

  const message = document.createElement('p');
  message.textContent = text;
  element.append(message);

  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--ghost btn--small';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick);
    element.append(button);
  }
  element.hidden = false;
}

/* ---------- 4. Navigation ---------- */
const VALID_VIEWS = ['home', 'search', 'favorites', 'cart', 'profile'];

function showView(name) {
  views.forEach((view) => { view.hidden = view.id !== `view-${name}`; });
  navLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.view === name));
  window.scrollTo({ top: 0 });
}

function handleRoute() {
  const name = location.hash.replace('#', '') || 'home';
  showView(VALID_VIEWS.includes(name) ? name : 'home');
}

window.addEventListener('hashchange', handleRoute);

/* ---------- 5. Product cards ---------- */
function mediaHTML(product) {
  const src = safeUrl(product.image);
  return src
    ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)}" loading="lazy" />`
    : `<span class="card__initial">${escapeHtml(product.brand.charAt(0))}</span>`;
}

const originLabel = (product) => (product.origin === 'local' ? 'Local' : 'International');

// One button per link. The href goes through OUR redirect so clicks are counted;
// the creator's real affiliate URL stays on the server.
function buyLinksHTML(product, extraClass = '') {
  const buttons = (product.links ?? [])
    .filter((link) => Object.hasOwn(PLATFORMS, link.platform))   // hasOwn: rejects names like "constructor"
    .slice(0, MAX_LINKS)
    .map((link) => `
      <a class="buy-link" data-platform="${escapeHtml(link.platform)}"
         href="${escapeHtml(goUrl(product.id, link.platform))}"
         target="_blank" rel="sponsored noopener noreferrer">
        ${escapeHtml(PLATFORMS[link.platform])} ↗
      </a>`);

  if (buttons.length === 0) return '<p class="card__nolinks">No shopping links yet.</p>';
  return `<div class="buy-links ${extraClass}">${buttons.join('')}</div>`;
}

function cartButtonHTML(id) {
  const added = cart.has(id);
  return `<button class="btn ${added ? 'btn--added' : ''}" data-action="toggle-cart" data-id="${escapeHtml(id)}">
            ${added ? 'In cart ✓' : 'Add to cart'}
          </button>`;
}

function productCardHTML(product) {
  const fav = favorites.has(product.id);

  return `
    <article class="card">
      <div class="card__media" style="background:${toneFor(product.id)}">
        ${mediaHTML(product)}
        <span class="card__tag">${escapeHtml(product.category)}</span>
        <button class="card__fav ${fav ? 'is-active' : ''}"
                data-action="favorite" data-id="${escapeHtml(product.id)}"
                aria-pressed="${fav}"
                aria-label="${fav ? 'Remove' : 'Add'} ${escapeHtml(product.name)} ${fav ? 'from' : 'to'} favorites">
          ${fav ? '♥' : '♡'}
        </button>
      </div>
      <div class="card__body">
        <div class="card__badges">
          <span class="pill" data-origin="${escapeHtml(product.origin)}">${originLabel(product)}</span>
        </div>
        <span class="card__brand">${escapeHtml(product.brand)}</span>
        <h3 class="card__name">${escapeHtml(product.name)}</h3>
        <p class="card__desc">${escapeHtml(product.description)}</p>
        <p class="card__by">Recommended by <strong>@${escapeHtml(product.recommendedBy)}</strong></p>
        <div class="card__footer">
          <div class="card__price-box">
            <span class="card__price">${formatPrice(product.price)}</span>
            <span class="card__price-note">about, as of ${formatMonth(product.priceUpdated)}</span>
          </div>
          ${cartButtonHTML(product.id)}
        </div>
        ${buyLinksHTML(product)}
      </div>
    </article>
  `;
}

/* ---------- 6. A paged product list (used by Home AND Search) ---------- */
// Owns one grid and its loading / error / empty / "Load more" states.
// fetchPage(pageNumber) must return { data, total }.
function createPagedList({ grid, statusEl, emptyEl, moreBtn, fetchPage, onRender }) {
  let items = [];
  let page = 0;
  let total = 0;
  let phase = 'loading';   // 'loading' | 'ready' | 'error'
  let errorMessage = '';
  let latest = 0;          // number of the newest request; older answers are ignored

  function render() {
    grid.innerHTML = items.map(productCardHTML).join('');
    emptyEl.hidden = !(phase === 'ready' && items.length === 0);
    moreBtn.hidden = !(phase === 'ready' && items.length < total);

    if (phase === 'loading') showStatus(statusEl, 'Loading…');
    else if (phase === 'error') {
      showStatus(statusEl, errorMessage, {
        label: 'Try again',
        // A failed first page starts over; a failed "load more" retries just that page.
        onClick: () => load({ reset: items.length === 0 })
      });
    } else showStatus(statusEl, '');

    onRender?.({ total, phase });
  }

  async function load({ reset = false } = {}) {
    const myCall = ++latest;
    const nextPage = reset ? 1 : page + 1;
    if (reset) items = [];
    phase = 'loading';
    render();

    try {
      const result = await fetchPage(nextPage);
      if (myCall !== latest) return;   // a newer request started; drop this answer
      items = reset ? result.data : [...items, ...result.data];
      page = nextPage;
      total = result.total;
      phase = 'ready';
    } catch (error) {
      if (myCall !== latest) return;
      phase = 'error';
      errorMessage = error.message;
    }
    render();
  }

  return { load };
}

const homeList = createPagedList({
  grid: productGrid, statusEl: homeStatus, emptyEl: emptyMessage, moreBtn: homeMore,
  fetchPage: (page) =>
    fetchProducts({ category: state.category, sort: state.sort, page, limit: PAGE_SIZE })
});

const searchList = createPagedList({
  grid: searchGrid, statusEl: searchStatus, emptyEl: searchEmpty, moreBtn: searchMore,
  fetchPage: (page) =>
    fetchProducts({
      q: search.query.trim(),
      category: search.category,
      brand: search.brand,
      platform: search.platform,
      page,
      limit: PAGE_SIZE
    }),
  onRender: ({ total, phase }) => {
    searchSummary.textContent = phase === 'ready' ? `Products (${total})` : 'Products';
  }
});

/* ---------- 7. Favorites & cart (they belong to an account) ---------- */
function savedStatus(element, what) {
  if (!getCachedUser()) {
    showStatus(element, `Log in to see your ${what}.`, { label: 'Go to Profile', onClick: goToProfile });
  } else if (savedError) {
    showStatus(element, savedError, { label: 'Try again', onClick: reloadSaved });
  } else {
    showStatus(element, '');
  }
}

function renderFavorites() {
  const loggedIn = Boolean(getCachedUser());
  const items = loggedIn ? favorites.all() : [];
  favoritesGrid.innerHTML = items.map(productCardHTML).join('');
  favoritesEmpty.hidden = !loggedIn || items.length > 0 || Boolean(savedError);
  savedStatus(favoritesStatus, 'favorites');
}

function cartItemHTML(product) {
  return `
    <li class="cart-item">
      <div class="cart-item__thumb" style="background:${toneFor(product.id)}">
        ${mediaHTML(product)}
      </div>

      <div class="cart-item__info">
        <span class="card__brand">${escapeHtml(product.brand)}</span>
        <h3 class="card__name">${escapeHtml(product.name)}</h3>
        <span class="cart-item__each">
          about ${formatPrice(product.price)} · by @${escapeHtml(product.recommendedBy)}
        </span>
      </div>

      ${buyLinksHTML(product, 'buy-links--cart')}

      <button class="icon-btn" data-action="remove" data-id="${escapeHtml(product.id)}"
              aria-label="Remove ${escapeHtml(product.name)} from cart">✕</button>
    </li>
  `;
}

function renderCart() {
  const loggedIn = Boolean(getCachedUser());
  const items = loggedIn ? cart.all() : [];
  cartItems.innerHTML = items.map(cartItemHTML).join('');
  cartLayout.hidden = !(loggedIn && items.length > 0);
  cartEmpty.hidden = !loggedIn || items.length > 0 || Boolean(savedError);
  savedStatus(cartStatus, 'cart');
}

function setBadge(element, count) {
  element.textContent = count;
  element.hidden = count === 0;
}

// Update hearts and cart buttons in place on EVERY grid (home, search, favorites).
function syncButtons() {
  document.querySelectorAll('[data-action="favorite"]').forEach((button) => {
    const active = favorites.has(button.dataset.id);
    button.classList.toggle('is-active', active);
    button.textContent = active ? '♥' : '♡';
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-action="toggle-cart"]').forEach((button) => {
    const added = cart.has(button.dataset.id);
    button.classList.toggle('btn--added', added);
    button.textContent = added ? 'In cart ✓' : 'Add to cart';
  });
}

function renderSaved() {
  renderFavorites();
  renderCart();
  setBadge(favBadge, favorites.count());
  setBadge(cartBadge, cart.count());
  syncButtons();
}

async function refreshSaved() {
  if (!getCachedUser()) {
    favorites.clear();
    cart.clear();
    savedError = '';
    return;
  }
  try {
    await Promise.all([favorites.load(), cart.load()]);
    savedError = '';
  } catch (error) {
    savedError = error.message;
  }
}

async function reloadSaved() {
  await refreshSaved();
  renderSaved();
}

/* ---------- 8. Search ---------- */
function userCardHTML(user) {
  const src = safeUrl(user.avatar);
  const avatar = src
    ? `<img src="${escapeHtml(src)}" alt="" />`
    : escapeHtml(user.name.charAt(0).toUpperCase());
  const count = user.productCount;

  return `
    <button class="user-card" type="button" data-action="view-user" data-username="${escapeHtml(user.username)}">
      <span class="avatar">${avatar}</span>
      <span class="user-card__text">
        <strong>${escapeHtml(user.name)}</strong>
        <span class="user-card__handle">@${escapeHtml(user.username)} · ${count} pick${count === 1 ? '' : 's'}</span>
        ${user.bio ? `<span class="user-card__bio">${escapeHtml(user.bio)}</span>` : ''}
      </span>
    </button>`;
}

let peopleCall = 0;
async function loadPeople() {
  const myCall = ++peopleCall;
  const filtersActive =
    search.category !== 'all' || search.brand !== 'all' || search.platform !== 'all';

  if (filtersActive) { searchPeopleBox.hidden = true; return; }

  try {
    const people = await fetchUsers(search.query.trim());
    if (myCall !== peopleCall) return;
    searchPeopleBox.hidden = people.length === 0;
    searchUsers.innerHTML = people.map(userCardHTML).join('');
  } catch {
    if (myCall === peopleCall) searchPeopleBox.hidden = true;   // people are a bonus; products show the error
  }
}

async function populateBrands() {
  try {
    const brands = await fetchBrands();
    if (search.brand !== 'all' && !brands.includes(search.brand)) search.brand = 'all';
    searchBrand.innerHTML = [
      '<option value="all">All brands</option>',
      ...brands.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`)
    ].join('');
    searchBrand.value = search.brand;
  } catch { /* keep whatever options we had */ }
}

function runSearch() {
  searchList.load({ reset: true });
  loadPeople();
}

/* ---------- 9. Refresh everything ---------- */
// Runs whenever login state changes or a recommendation is added/edited/deleted.
async function refreshAll() {
  const saved = refreshSaved();          // start these loading in parallel…
  homeList.load({ reset: true });
  populateBrands();
  runSearch();
  await saved;                           // …and draw favorites/cart when they arrive
  renderSaved();
}

/* ---------- 10. Event listeners ---------- */
filtersBox.addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip) return;

  state.category = chip.dataset.category;
  filtersBox.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
  chip.classList.add('is-active');
  homeList.load({ reset: true });
});

sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value;
  homeList.load({ reset: true });
});

homeMore.addEventListener('click', () => homeList.load());
searchMore.addEventListener('click', () => searchList.load());

const runSearchSoon = debounce(runSearch, 300);
searchInput.addEventListener('input', () => { search.query = searchInput.value; runSearchSoon(); });
searchCategory.addEventListener('change', () => { search.category = searchCategory.value; runSearch(); });
searchBrand.addEventListener('change', () => { search.brand = searchBrand.value; runSearch(); });
searchPlatform.addEventListener('change', () => { search.platform = searchPlatform.value; runSearch(); });

// Clicking a person searches "@username", which shows their recommendations.
searchUsers.addEventListener('click', (event) => {
  const card = event.target.closest('[data-action="view-user"]');
  if (!card) return;

  searchInput.value = `@${card.dataset.username}`;
  search.query = searchInput.value;
  runSearch();
  searchGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Hearts and cart buttons: one handler for every product grid.
async function handleProductAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;   // clicks on buy links just open the link

  const action = button.dataset.action;
  if (action !== 'favorite' && action !== 'toggle-cart') return;

  if (!getCachedUser()) {
    showToast('Log in to save products.');
    goToProfile();
    return;
  }

  const savedList = action === 'favorite' ? favorites : cart;
  button.disabled = true;   // blocks double-clicks while the request is in flight
  try {
    await savedList.toggle(button.dataset.id);
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
  renderSaved();
}

productGrid.addEventListener('click', handleProductAction);
favoritesGrid.addEventListener('click', handleProductAction);
searchGrid.addEventListener('click', handleProductAction);

cartItems.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="remove"]');
  if (!button) return;

  button.disabled = true;
  try {
    await cart.remove(button.dataset.id);
  } catch (error) {
    showToast(error.message);
    button.disabled = false;
    return;
  }
  renderSaved();
});

document.addEventListener('catalog:changed', refreshAll);   // a recommendation changed
document.addEventListener('auth:changed', refreshAll);      // login, logout, or profile change

/* ---------- 11. Start ---------- */
handleRoute();
showStatus(homeStatus, 'Loading…');
initProfile();   // checks the login, then fires auth:changed → refreshAll