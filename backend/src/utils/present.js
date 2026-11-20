// Tells Mongoose: replace the `owner` id with the user's document (username only).
export const OWNER_POPULATE = { path: 'owner', select: 'username' };

// Expects a product whose `owner` was populated. Output matches the earlier API:
// the owner's CURRENT username as `recommendedBy`, plus `ownerId`.
export function presentProduct(product) {
  const { owner, ...rest } = product.toJSON();
  return {
    ...rest,
    ownerId: owner?.id ?? null,
    recommendedBy: owner?.username ?? 'former_member'   // owner null = account deleted
  };
}