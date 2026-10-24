import { ZodError } from "zod";

export class AppError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what = "Record") => new AppError(404, "NOT_FOUND", `${what} not found.`);
export const validationFail = (details, message = "Some fields need attention.") =>
  new AppError(400, "VALIDATION_ERROR", message, details);

export function zodDetails(zerr) {
  const details = {};
  for (const issue of zerr.issues) {
    const key = issue.path.join(".") || "_";
    if (!details[key]) details[key] = issue.message;
  }
  return details;
}

// Validate input with zod; throw the contract's 400 on failure.
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) throw validationFail(zodDetails(result.error));
  return result.data;
}

export const OBJECT_ID = /^[a-f0-9]{24}$/i;
// Not mongoose.isValidObjectId: that also accepts any 12-character string.
export const isObjectIdString = (v) => typeof v === "string" && OBJECT_ID.test(v);
export function assertId(v, what) {
  if (!isObjectIdString(v)) throw notFound(what);
}
