import { badRequest } from './errors.js';

export const REGIONS = [
  'Yerevan', 'Aragatsotn', 'Ararat', 'Armavir', 'Gegharkunik', 'Kotayk',
  'Lori', 'Shirak', 'Syunik', 'Tavush', 'Vayots Dzor',
];

/**
 * Tiny field validator. Collects per-field messages and throws one 400 with all of them.
 *   const v = new Validator(req.body);
 *   const name = v.string('name', { min: 2, max: 80, label: 'Name' });
 *   v.done();
 */
export class Validator {
  constructor(body) {
    this.body = body && typeof body === 'object' ? body : {};
    this.fields = {};
  }

  fail(field, message) {
    if (!this.fields[field]) this.fields[field] = message;
    return undefined;
  }

  has(field) {
    return this.body[field] !== undefined;
  }

  string(field, { min = 0, max = 1000, label = field, optional = false, pattern, patternMessage } = {}) {
    const raw = this.body[field];
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      if (optional) return null;
      return this.fail(field, `${label} is required.`);
    }
    if (typeof raw !== 'string' && typeof raw !== 'number') return this.fail(field, `${label} must be text.`);
    const value = String(raw).trim();
    if (value.length < min) return this.fail(field, `${label} must be at least ${min} characters.`);
    if (value.length > max) return this.fail(field, `${label} must be at most ${max} characters.`);
    if (pattern && !pattern.test(value)) return this.fail(field, patternMessage || `${label} is not valid.`);
    return value;
  }

  int(field, { min = -Infinity, max = Infinity, label = field, optional = false } = {}) {
    const raw = this.body[field];
    if (raw === undefined || raw === null || raw === '') {
      if (optional) return null;
      return this.fail(field, `${label} is required.`);
    }
    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[\s,]/g, ''));
    if (!Number.isInteger(n)) return this.fail(field, `${label} must be a whole number.`);
    if (n < min) return this.fail(field, `${label} must be at least ${min.toLocaleString('en-US')}.`);
    if (n > max) return this.fail(field, `${label} must be at most ${max.toLocaleString('en-US')}.`);
    return n;
  }

  email(field = 'email') {
    // Any syntactically plausible address works — no confirmation e-mails are sent.
    return this.string(field, {
      min: 3, max: 120, label: 'Email',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'Enter an email like name@example.com.',
    })?.toLowerCase();
  }

  phone(field = 'phone') {
    return this.string(field, {
      min: 6, max: 20, label: 'Phone',
      pattern: /^\+?[\d\s()-]{6,20}$/, patternMessage: 'Enter a phone number like +374 91 123456.',
    });
  }

  oneOf(field, values, { label = field } = {}) {
    const raw = this.body[field];
    if (!values.includes(raw)) return this.fail(field, `Choose a valid ${label.toLowerCase()}.`);
    return raw;
  }

  done(message = 'Please fix the highlighted fields.') {
    if (Object.keys(this.fields).length) throw badRequest(message, this.fields);
  }
}

export function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
