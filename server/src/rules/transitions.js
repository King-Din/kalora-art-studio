// The ONLY legal status changes in the whole app. Shape: kind -> from -> to -> roles allowed.
// Terminal states (declined, cancelled, accepted pottery) simply have no entry.
export const TRANSITIONS = {
  order: {
    placed: { cancelled: ["customer"] },
  },
  booking: {
    requested: { confirmed: ["studio"], declined: ["studio"], cancelled: ["customer"] },
    confirmed: { cancelled: ["customer"] },
  },
  pottery: {
    requested: { accepted: ["studio"], declined: ["studio"], cancelled: ["customer"] },
  },
};

export function canTransition(kind, from, to, role) {
  return Boolean(TRANSITIONS[kind]?.[from]?.[to]?.includes(role));
}

// Every "from" state that may move to `to` for this role.
export function fromStatesFor(kind, to, role) {
  return Object.keys(TRANSITIONS[kind] ?? {}).filter((from) => canTransition(kind, from, to, role));
}
