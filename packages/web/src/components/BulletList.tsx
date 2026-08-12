import type { ReactNode } from "react";
import { Button, IconButton, TextArea } from "./ui";

/**
 * The repeating "one achievement per line" control, shared by experience entries
 * and projects.
 *
 * `renderAction` is the slot the AI rewrite button drops into — kept as a render prop
 * so this component stays unaware of anything model-related.
 */
export function BulletList({
  label,
  values,
  placeholder,
  addLabel = "+ Add bullet",
  onChange,
  onAdd,
  onRemove,
  onMove,
  renderAction,
}: {
  label: string;
  values: string[];
  placeholder?: string;
  addLabel?: string;
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (index: number, to: number) => void;
  renderAction?: (index: number, value: string) => ReactNode;
}) {
  return (
    <div className="bullet-list">
      <div className="bullet-list__header">
        <span className="field__label">{label}</span>
        <Button variant="ghost" onClick={onAdd}>
          {addLabel}
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="empty-hint">Nothing here yet.</p>
      ) : (
        values.map((value, index) => (
          <div className="bullet-row" key={index}>
            <TextArea
              value={value}
              rows={2}
              placeholder={placeholder}
              onChange={(next) => onChange(index, next)}
            />
            <div className="bullet-row__controls">
              {renderAction?.(index, value)}
              <IconButton
                label="Move up"
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
              >
                ↑
              </IconButton>
              <IconButton
                label="Move down"
                disabled={index === values.length - 1}
                onClick={() => onMove(index, index + 1)}
              >
                ↓
              </IconButton>
              <IconButton
                label="Remove bullet"
                variant="danger"
                onClick={() => onRemove(index)}
              >
                ×
              </IconButton>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
