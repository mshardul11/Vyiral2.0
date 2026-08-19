import { useEffect, useRef, type ReactNode } from "react";

/**
 * A focus-trapping modal dialog, used by the import and guided-questions flows.
 *
 * Uses <dialog> so the browser handles the backdrop, the top layer, and Escape
 * rather than reimplementing them.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? " modal--wide" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Clicking the backdrop hits the dialog element itself, not its content.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal__header">
        <h2 className="modal__title">{title}</h2>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal__body">{children}</div>
      {footer ? <div className="modal__footer">{footer}</div> : null}
    </dialog>
  );
}
