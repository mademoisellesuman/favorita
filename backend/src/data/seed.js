// Passwords don't exist yet. Real accounts arrive in Stage 5.
export const seedUsers = [
  { id: 'u1', username: 'ana_glow',    name: 'Ana Reyes',     email: 'ana@example.com',  bio: 'Skincare minimalist.', avatar: '' },
  { id: 'u2', username: 'mika_beauty', name: 'Mika Santos',   email: 'mika@example.com', bio: 'Makeup on a budget.',  avatar: '' },
  { id: 'u3', username: 'joy_skin',    name: 'Joy Dela Cruz', email: 'joy@example.com',  bio: '',                     avatar: '' }
];

// All URLs are placeholders, not real product pages.
export const seedProducts = [
  { id: 'p1', ownerId: 'u1', name: 'Hydrating Facial Cleanser', brand: 'CeraVe', category: 'skincare', origin: 'international', price: 799, priceUpdated: '2026-11-05', createdAt: '2026-11-05T08:00:00.000Z', image: '',
    description: 'Gentle, non-foaming cleanser with ceramides and hyaluronic acid.',
    links: [
      { platform: 'shopee', url: 'https://shopee.ph/example-1' },
      { platform: 'lazada', url: 'https://www.lazada.com.ph/example-1' },
      { platform: 'tiktok', url: 'https://www.tiktok.com/example-1' }
    ] },
  { id: 'p2', ownerId: 'u3', name: 'Papaya Brightening Soap', brand: 'Silka', category: 'skincare', origin: 'local', price: 85, priceUpdated: '2026-11-10', createdAt: '2026-11-10T08:00:00.000Z', image: '',
    description: 'Budget-friendly papaya soap for a brighter-looking, smooth feel.',
    links: [{ platform: 'shopee', url: 'https://shopee.ph/example-2' }] },
  { id: 'p3', ownerId: 'u2', name: 'Essentials Sunscreen Gel', brand: 'Belo', category: 'skincare', origin: 'local', price: 420, priceUpdated: '2026-11-12', createdAt: '2026-11-12T08:00:00.000Z', image: '',
    description: 'Lightweight daily sunscreen with a non-greasy finish.',
    links: [
      { platform: 'tiktok', url: 'https://www.tiktok.com/example-3' },
      { platform: 'shopee', url: 'https://shopee.ph/example-3' }
    ] },
  { id: 'p4', ownerId: 'u1', name: 'Soft Pinch Liquid Blush', brand: 'Rare Beauty', category: 'makeup', origin: 'international', price: 1350, priceUpdated: '2026-11-06', createdAt: '2026-11-06T08:00:00.000Z', image: '',
    description: 'Weightless, long-lasting liquid blush with a natural flush.',
    links: [{ platform: 'lazada', url: 'https://www.lazada.com.ph/example-4' }] },
  { id: 'p5', ownerId: 'u2', name: 'Lip Tint Duo', brand: 'Happy Skin', category: 'makeup', origin: 'local', price: 349, priceUpdated: '2026-11-09', createdAt: '2026-11-09T08:00:00.000Z', image: '',
    description: 'Buildable lip and cheek tint in a soft, natural shade.',
    links: [
      { platform: 'shopee', url: 'https://shopee.ph/example-5' },
      { platform: 'lazada', url: 'https://www.lazada.com.ph/example-5' }
    ] },
  { id: 'p6', ownerId: 'u3', name: 'Lash Sensational Mascara', brand: 'Maybelline', category: 'makeup', origin: 'international', price: 499, priceUpdated: '2026-11-04', createdAt: '2026-11-04T08:00:00.000Z', image: '',
    description: 'Fanning brush for full, defined lashes without clumps.',
    links: [
      { platform: 'tiktok', url: 'https://www.tiktok.com/example-6' },
      { platform: 'shopee', url: 'https://shopee.ph/example-6' }
    ] }
];