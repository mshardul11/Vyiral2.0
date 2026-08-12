import type { ReactNode } from "react";

/** Small, unstyled-ish building blocks so the section components stay readable. */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {hint ? <span className="field__hint">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url";
}) {
  return (
    <input
      className="input"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      className="input input--area"
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  disabled,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`button button--${variant}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

/** Compact square control used for reorder and delete affordances. */
export function IconButton({
  label,
  onClick,
  disabled,
  children,
  variant = "ghost",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      className={`icon-button icon-button--${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section__header">
        <div>
          <h2 className="section__title">{title}</h2>
          {description ? <p className="section__description">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="section__body">{children}</div>
    </section>
  );
}

/**
 * A card for one item in a repeating list, with the reorder and remove controls
 * every list section needs. Reordering uses ↑/↓ buttons rather than drag-and-drop:
 * same outcome, keyboard-operable, and no extra dependency.
 */
export function ItemCard({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  title: string;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="item-card">
      <div className="item-card__header">
        <span className="item-card__title">{title}</span>
        <div className="item-card__controls">
          <IconButton
            label="Move up"
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
          >
            ↑
          </IconButton>
          <IconButton
            label="Move down"
            onClick={() => onMove(index + 1)}
            disabled={index === count - 1}
          >
            ↓
          </IconButton>
          <IconButton label="Remove" onClick={onRemove} variant="danger">
            ×
          </IconButton>
        </div>
      </div>
      <div className="item-card__body">{children}</div>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="row">{children}</div>;
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="empty-hint">{children}</p>;
}
