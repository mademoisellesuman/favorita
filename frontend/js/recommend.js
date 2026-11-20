import * as auth from './auth.js';
import { PLATFORMS } from './constants.js';
import { escapeHtml, formatPrice } from './utils.js';
import { wireForm, clearFeedback, setMessage } from './profile.js';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from './productsApi.js';
import { showToast } from './toast.js';

const form = document.getElementById('recommendForm');
const formTitle = document.getElementById('recommendTitle');
const cancelBtn = document.getElementById('recommendCancel');
const list = document.getElementById('myRecs');
const listEmpty = document.getElementById('myRecsEmpty');

let mine = [];          // my recommendations, from the server
let mineError = '';
let editingId = null;   // null = adding; a string id = editing that product
let loadCount = 0;      // "latest request wins"

const announceCatalogChange = () =>
  document.dispatchEvent(new CustomEvent('catalog:changed'));

/* ---------- Load and draw "My recommendations" ---------- */
async function loadMine() {
  const current = ++loadCount;
  const user = auth.getCachedUser();

  if (!user) {
    mine = []; mineError = '';
    render();
    return;
  }

  try {
    // The server filters by owner username. 50 is its maximum page size.
    const { data } = await fetchProducts({ owner: user.username, limit: 50 });
    if (current !== loadCount) return;
    mine = data; mineError = '';
  } catch (error) {
    if (current !== loadCount) return;
    mineError = error.message;
  }
  render();
}

function render() {
  listEmpty.textContent = mineError || "You haven't recommended anything yet.";
  listEmpty.hidden = mine.length > 0;

  list.innerHTML = mine.map((p) => {
    const where = p.links.map((l) => PLATFORMS[l.platform] ?? l.platform).join(', ');
    return `
      <li class="mine">
        <div class="mine__info">
          <strong>${escapeHtml(p.name)}</strong>
          <span>${escapeHtml(p.brand)} · ${formatPrice(p.price)} · ${escapeHtml(where)}</span>
        </div>
        <div class="mine__actions">
          <button class="btn btn--ghost btn--small" type="button" data-action="edit" data-id="${escapeHtml(p.id)}">Edit</button>
          <button class="btn btn--ghost btn--small" type="button" data-action="delete" data-id="${escapeHtml(p.id)}">Delete</button>
        </div>
      </li>`;
  }).join('');
}

/* ---------- Add / edit mode ---------- */
const setField = (name, value) => { form.elements[name].value = value ?? ''; };

function startEdit(product) {
  editingId = product.id;
  const urlFor = (platform) => product.links.find((l) => l.platform === platform)?.url;

  clearFeedback(form);
  setField('productName', product.name);
  setField('brand', product.brand);
  setField('category', product.category);
  setField('origin', product.origin);
  setField('price', product.price);
  setField('image', product.image);
  setField('description', product.description);
  setField('linkShopee', urlFor('shopee'));
  setField('linkLazada', urlFor('lazada'));
  setField('linkTiktok', urlFor('tiktok'));

  formTitle.textContent = 'Edit recommendation';
  cancelBtn.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitEdit() {
  editingId = null;
  form.reset();
  clearFeedback(form);
  formTitle.textContent = 'Recommend a product';
  cancelBtn.hidden = true;
}

cancelBtn.addEventListener('click', exitEdit);

list.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || !auth.getCachedUser()) return;

  const id = button.dataset.id;   // a string now, no Number()

  if (button.dataset.action === 'edit') {
    const product = mine.find((p) => p.id === id);
    if (product) startEdit(product);
  }

  if (button.dataset.action === 'delete') {
    if (!confirm('Delete this recommendation?')) return;
    button.disabled = true;
    try {
      await deleteProduct(id);   // the server re-checks that it's yours (403 otherwise)
    } catch (error) {
      showToast(error.message);
      button.disabled = false;
      return;
    }
    if (editingId === id) exitEdit();
    await loadMine();
    announceCatalogChange();
  }
});

/* ---------- The form ---------- */
// Form fields → the JSON body the API expects.
function toBody(v) {
  const links = [['shopee', v.linkShopee], ['lazada', v.linkLazada], ['tiktok', v.linkTiktok]]
    .filter(([, url]) => url)
    .map(([platform, url]) => ({ platform, url }));

  return {
    name: v.productName,
    brand: v.brand,
    category: v.category,
    origin: v.origin,
    price: Number(v.price),   // the form gives a string; the server requires a number
    image: v.image,
    description: v.description,
    links
  };
}

wireForm(
  form,
  ['productName', 'brand', 'category', 'origin', 'price', 'image', 'description',
   'linkShopee', 'linkLazada', 'linkTiktok', 'links'],
  async (values) => {
    if (!auth.getCachedUser()) throw new Error('Please log in first.');
    const body = toBody(values);
    try {
      if (editingId) await updateProduct(editingId, body);
      else await createProduct(body);
    } catch (error) {
      // The API calls it "name", but this form's input is named "productName".
      if (error.field === 'name') error.field = 'productName';
      throw error;
    }
  },
  async () => {
    const wasEditing = editingId !== null;
    exitEdit();
    setMessage(form, wasEditing ? 'Recommendation updated.' : 'Recommendation posted!', 'success');
    await loadMine();
    announceCatalogChange();
  }
);

/* ---------- Login / logout ---------- */
document.addEventListener('auth:changed', () => {
  if (!auth.getCachedUser()) exitEdit();
  loadMine();
});