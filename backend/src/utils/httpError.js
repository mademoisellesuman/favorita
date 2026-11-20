export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;     // e.g. 404
    this.details = details;   // optional: per-field validation errors
  }
}