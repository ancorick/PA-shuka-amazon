import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { UPLOADS_DIR, UPLOADS_PUBLIC_PATH } from './config.js';
import { HttpError } from './errors.js';

sharp.cache(false); // do not keep file handles open (matters on Windows)

export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES },
});

const badType = (name) =>
  new HttpError(400, 'BAD_FILE_TYPE', `"${name}" is not a JPEG, PNG or WebP image.`);

/** Checks the real file content (not the extension). Throws 400 for anything that is not an image. */
export async function assertImage(buffer, name = 'file') {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw badType(name);
  }
  if (!ALLOWED_FORMATS.has(meta.format)) throw badType(name);
  return meta;
}

/** Resizes into a thumbnail and a large version, saves both as WebP, returns the base name. */
export async function saveImage(buffer) {
  const base = `img-${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`;
  const pipeline = sharp(buffer, { failOn: 'error' }).rotate().flatten({ background: '#ffffff' });
  await Promise.all([
    pipeline.clone().resize(400, 400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 })
      .toFile(path.join(UPLOADS_DIR, `${base}_thumb.webp`)),
    pipeline.clone().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 })
      .toFile(path.join(UPLOADS_DIR, `${base}_large.webp`)),
  ]);
  return base;
}

export function removeImageFiles(base) {
  for (const suffix of ['_thumb.webp', '_large.webp']) {
    fs.rm(path.join(UPLOADS_DIR, base + suffix), { force: true }, () => {});
  }
}

export function imageUrls(base) {
  if (!base) return null;
  return {
    thumb: `${UPLOADS_PUBLIC_PATH}/${base}_thumb.webp`,
    large: `${UPLOADS_PUBLIC_PATH}/${base}_large.webp`,
  };
}
