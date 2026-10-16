// Adapted from Rare UI folder-component (https://rareui.com), copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution; see ./LICENSE.
export function FolderIcon() {
  return (
    <svg
      aria-hidden="true"
      className="rare-folder-icon"
      width="22"
      height="22"
      viewBox="0 0 321 281"
      fill="none"
    >
      <path
        d="M25 0.5H136.084C142.905 0.5 149.417 3.3431 154.054 8.3457L177.713 33.874C182.539 39.0808 189.317 42.04 196.416 42.04H296C309.531 42.04 320.5 53.0092 320.5 66.54V216C320.5 229.531 309.531 240.5 296 240.5H25C11.469 240.5 0.5 229.531 0.5 216V25C0.5 11.469 11.469 0.5 25 0.5Z"
        fill="currentColor"
        opacity="0.35"
      />
      <rect
        className="rare-folder-paper"
        x="40"
        y="60"
        width="240"
        height="170"
        rx="12"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        className="rare-folder-flap"
        d="M25 70H296C310 70 321 81 321 95V256C321 270 310 281 296 281H25C11 281 0 270 0 256V95C0 81 11 70 25 70Z"
        fill="currentColor"
      />
    </svg>
  );
}
