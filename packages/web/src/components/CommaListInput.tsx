import { useEffect, useRef, useState } from "react";

/**
 * Edits a `string[]` as a comma-separated line.
 *
 * Naively binding the input to `items.join(", ")` eats the separator: the moment you
 * type "Go," the parsed array is still ["Go"], which re-renders as "Go" and deletes
 * the comma under the cursor. So the raw text is held locally and only re-synced from
 * props when the incoming array differs from what the local text parses to — i.e.
 * when something other than this input changed it (undo, import, an AI rewrite).
 */
export function CommaListInput({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => items.join(", "));
  const lastEmitted = useRef<string[]>(items);

  useEffect(() => {
    const changedElsewhere =
      items.length !== lastEmitted.current.length ||
      items.some((item, index) => item !== lastEmitted.current[index]);
    if (changedElsewhere) {
      setText(items.join(", "));
      lastEmitted.current = items;
    }
  }, [items]);

  return (
    <input
      className="input"
      type="text"
      value={text}
      placeholder={placeholder}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const parsed = next
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        lastEmitted.current = parsed;
        onChange(parsed);
      }}
    />
  );
}
