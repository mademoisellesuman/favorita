import { request } from './api.js';

// One factory builds both lists, the same trick as on the server.
// The list keeps full products in memory so cards can ask "is this a favorite?"
// instantly, but the SERVER is the source of truth.
function createSavedList(path) {
  let items = [];   // newest first

  async function load() {
    const { data } = await request('GET', path);
    items = data;
  }

  return {
    load,
    clear() { items = []; },
    has: (id) => items.some((product) => product.id === id),
    all: () => [...items],
    count: () => items.length,

    async toggle(id) {
      const saved = items.some((product) => product.id === id);
      await request(saved ? 'DELETE' : 'PUT', `${path}/${id}`);
      await load();   // re-sync with the server instead of guessing
    },

    async remove(id) {
      await request('DELETE', `${path}/${id}`);
      await load();
    }
  };
}

export const favorites = createSavedList('/favorites');
export const cart = createSavedList('/cart');