// Turns "a.b*" into "a\.b\*" so it matches those exact characters.
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');