import { useEffect, useRef } from "react";

// Native <dialog>: focus trapping and Escape handling come from the browser.
export default function ConfirmDialog({ open, title, children, confirmLabel = "Confirm", onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onCancel} aria-labelledby="dlg-title">
      <h3 id="dlg-title">{title}</h3>
      <div>{children}</div>
      <div className="row">
        <button onClick={onConfirm}>{confirmLabel}</button>
        <button className="secondary" onClick={onCancel}>Back</button>
      </div>
    </dialog>
  );
}
