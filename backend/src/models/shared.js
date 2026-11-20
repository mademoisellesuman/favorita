// Applied to every schema: output `id` (from _id) and hide internal/sensitive fields.
export const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform(doc, ret) {
    delete ret._id;
    delete ret.passwordHash;   // defense in depth
    delete ret.tokenVersion;
    return ret;
  }
};