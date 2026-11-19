export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const badRequest = (message, fields) =>
  new HttpError(400, 'VALIDATION', message, fields ? { fields } : {});
export const unauthorized = (message = 'Please sign in to continue.') =>
  new HttpError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'You are not allowed to do this.', code = 'FORBIDDEN') =>
  new HttpError(403, code, message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (code, message, extra) => new HttpError(409, code, message, extra);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  // multer
  if (err?.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: { code: 'FILE_TOO_LARGE', message: 'Image is larger than 5 MB. Please choose a smaller photo.' } });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: { code: 'TOO_MANY_FILES', message: 'You can upload up to 5 images per product.' } });
    }
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON.' } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(400).json({ error: { code: 'BODY_TOO_LARGE', message: 'Request body is too large.' } });
  }
  if (err?.code === 'SQLITE_BUSY') {
    return res.status(503).json({ error: { code: 'BUSY', message: 'The server is busy, please try again.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } });
}
