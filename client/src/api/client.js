// One small wrapper. Every failure becomes the same shape: { code, message, details, requestId, status }.
export class ApiError extends Error {
  constructor({ status = 0, code, message, details = {}, requestId }) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError({ code: "NETWORK", message: "Cannot reach the server." });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError({ status: res.status, code: e.code ?? "INTERNAL_ERROR", message: e.message, details: e.details, requestId: e.requestId });
  }
  return data;
}
