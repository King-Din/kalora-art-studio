import { AppError, zodDetails } from "./errors.js";
import { ZodError } from "zod";

const hasLabel = (err, label) => typeof err?.hasErrorLabel === "function" && err.hasErrorLabel(label);

// The ONE place every error becomes the response contract. Nothing internal reaches the client.
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong on our side. Please try again.";
  let details = {};

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err?.type === "entity.too.large") {
    [status, code, message] = [413, "PAYLOAD_TOO_LARGE", "That request is too large."];
  } else if (err?.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400)) {
    [status, code, message] = [400, "VALIDATION_ERROR", "The request body is not valid JSON."];
  } else if (err instanceof ZodError) {
    [status, code, message, details] = [400, "VALIDATION_ERROR", "Some fields need attention.", zodDetails(err)];
  } else if (err?.name === "ValidationError" && err.errors) {
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    [status, code, message] = [400, "VALIDATION_ERROR", "Some fields need attention."];
  } else if (err?.name === "CastError") {
    [status, code, message] = [404, "NOT_FOUND", "Record not found."];
  } else if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    [status, code, message] = [401, "UNAUTHENTICATED", "Please log in to continue."];
  } else if (err?.code === 11000) {
    // Duplicate key = a database uniqueness guarantee just fired. Pick the code from the index that fired.
    const keys = Object.keys(err.keyPattern ?? {});
    status = 409;
    if (keys.includes("email")) [code, message] = ["EMAIL_TAKEN", "An account with this email already exists."];
    else if (keys.includes("painting")) [code, message] = ["PAINTING_ALREADY_SOLD", "Someone bought this painting a moment ago."];
    else if (keys.includes("date")) [code, message] = ["DATE_TAKEN", "That date was just taken by someone else."];
    else [code, message] = ["INVALID_STATE", "That action conflicts with the current state."];
  } else if (hasLabel(err, "TransientTransactionError") || err?.code === 112) {
    [status, code, message] = [409, "INVALID_STATE", "The record changed at the same moment. Please refresh and retry."];
  }

  if (status === 500) console.error(`[${req.id}] unhandled ${err?.name}: ${err?.message}`);
  res.status(status).json({ error: { code, message, details, requestId: req.id } });
}
