// Every server error code -> a friendly sentence.
const MESSAGES = {
  VALIDATION_ERROR: "Some details need fixing. Please check the highlighted fields.",
  UNAUTHENTICATED: "Please log in to continue.",
  INVALID_CREDENTIALS: "That email or password is not right.",
  FORBIDDEN: "Your account type can't do that.",
  NOT_FOUND: "We couldn't find that. It may have been removed.",
  PAINTING_ALREADY_SOLD: "Someone bought this a moment ago.",
  DATE_TAKEN: "That date was just taken by someone else.",
  INVALID_STATE: "That item changed in the meantime, so the action isn't possible any more.",
  CANCELLATION_WINDOW_CLOSED: "It is too late to cancel this booking (cancellation closes 3 days before the date).",
  EMAIL_TAKEN: "An account with this email already exists. Try logging in.",
  PAYLOAD_TOO_LARGE: "That was too much data to send.",
  TOO_MANY_REQUESTS: "Too many attempts. Please wait a few minutes and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  NETWORK: "Cannot reach the server. Check your connection and retry.",
};

export function friendly(err) {
  if (!err) return "";
  // The server's message is already human-readable and specific; fall back to the table.
  return err.message || MESSAGES[err.code] || MESSAGES.INTERNAL_ERROR;
}
export const generic = (code) => MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR;
