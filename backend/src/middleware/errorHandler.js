import { HttpError } from '../utils/httpError.js';

export function notFound(req, res) {
  res.status(404).json({ error: { message: `No such endpoint: ${req.method} ${req.originalUrl}` } });
}

// Express recognizes an error handler by its FOUR parameters. Keep `next`.
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { message: err.message, ...(err.details && { details: err.details }) }
    });
  }

  // Errors raised by express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Request body is not valid JSON.' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request body is too large.' } });
  }

  // --- Database errors ---

  // The schema rejected a value (the last line of defense behind our validators).
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
    return res.status(400).json({ error: { message: 'Validation failed.', details } });
  }

  // A malformed id slipped through.
  if (err.name === 'CastError') {
    return res.status(400).json({ error: { message: `Invalid value for "${err.path}".` } });
  }

  // 11000 = a unique index refused a duplicate (taken email, taken username).
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'value';
    const message = `That ${field} is already taken.`;
    return res.status(409).json({ error: { message, details: { [field]: message } } });
  }

  // Anything else is a bug. Log it for YOU, but never show details to the client.
  console.error(err);
  res.status(500).json({ error: { message: 'Something went wrong on the server.' } });
}