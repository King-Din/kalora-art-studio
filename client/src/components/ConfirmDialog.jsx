import { useEffect, useRef } from "react";

// Native <dialog>: focus trapping and Escape handling come from the browser.
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onCancel} aria-labelledby="dlg-title">
      <h3 id="dlg-title" style={{ marginTop: 0, fontFamily: "var(--font-serif)", fontSize: "1.6rem" }}>
        {title}
      </h3>
      <div style={{ margin: "1rem 0 1.5rem 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
        {children}
      </div>
      <div className="row" style={{ justifyContent: "flex-end", gap: "0.75rem", margin: 0 }}>
        <button type="button" className="secondary" onClick={onCancel}>
          Keep Active
        </button>
        <button type="button" className="btn" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
