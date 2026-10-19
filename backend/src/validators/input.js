export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function objectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'A JSON object is required.');
  return body;
}

export function requiredText(value, label, max = 10000, min = 1) {
  if (typeof value !== 'string') throw new HttpError(400, `${label} is required.`);
  const text = value.trim();
  if (text.length < min || text.length > max) throw new HttpError(400, `${label} must be ${min}-${max} characters.`);
  return text;
}

export function passwordValue(value, minimum = 6) {
  if (typeof value !== 'string' || value.length < minimum || Buffer.byteLength(value, 'utf8') > 72) {
    throw new HttpError(400, `Password must contain at least ${minimum} characters and at most 72 UTF-8 bytes.`);
  }
  return value;
}

export function positiveId(value, label = 'ID') {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
    throw new HttpError(400, `${label} must be a positive integer.`);
  }
  return Number(value);
}

export function optionalId(value, label) {
  return value === undefined || value === '' ? null : positiveId(value, label);
}

export function dateValue(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, `${label} must be a valid date (YYYY-MM-DD).`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new HttpError(400, `${label} must be a valid date (YYYY-MM-DD).`);
  return value;
}
