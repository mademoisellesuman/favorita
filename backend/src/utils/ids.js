import mongoose from 'mongoose';
import { HttpError } from './httpError.js';

// An id that can't possibly exist is simply "not found".
export function assertId(id, message = 'Not found.') {
  if (!mongoose.isObjectIdOrHexString(id)) throw new HttpError(404, message);
}