import { Router } from 'express';
import productsRouter from './products.routes.js';
import favoritesRouter from './favorites.routes.js';
import cartRouter from './cart.routes.js';
import usersRouter from './users.routes.js';
import authRouter from './auth.routes.js';
import goRouter from './go.routes.js';
import statsRouter from './stats.routes.js';

const router = Router();

router.use('/products', productsRouter);    // → /api/products
router.use('/favorites', favoritesRouter);  // → /api/favorites
router.use('/go', goRouter);                // → /api/go
router.use('/stats', statsRouter);          // → /api/stats
router.use('/auth', authRouter);            // → /api/auth
router.use('/cart', cartRouter);            // → /api/cart
router.use('/users', usersRouter);          // → /api/users

export default router;