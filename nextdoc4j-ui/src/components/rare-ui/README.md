# Rare UI adaptations

Components adapted from [Rare UI](https://rareui.com), copyright (c) 2026 Swami Malode.
Upstream: https://github.com/swamimalode07/rare-ui/tree/cb455b2d071dc9d0d90397294824578c6678561d

The upstream license is **MIT + Commons Clause + Attribution**, reproduced in [LICENSE](./LICENSE).
Keep the source credit and license when modifying or shipping these files. Components may be used
as part of an application, including a commercial application, but may not be resold or redistributed
as standalone components, a component bundle, or a port. The Rare UI name, logo and site design are
not included in that license.

- `animated-counter`: copied digit wheels; decorative digits use CSS content so accessible and copied text contains one value.
- `code-block`: copied static highlighting and copy animations; matching 8px frame/header corners and moving JSON row hover; Tailwind 3 syntax, Tabler icon, Chinese copy labels and dialog-aware clipboard fallback.
- `delete-button`: compact adaptation of the trash lid and confirmation interaction; row confirmation shows only check and cancel icons with accessible context; bulk confirmation retains its explanation and awaits asynchronous completion.
- `rail-toc`: copied the original dotted rail, depth-aware nodes and traveling paper plane; connected to the workspace scroller with Chinese labels, Tailwind 3 colors and long-directory tracking. The plane stays between the first and last nodes; overscroll flight is removed.
- `scroll-progress`: adapted the progress ring, translucent pill and spring interaction; always displays a percentage and returns the owning document scroller to the top.
- `moving-highlight`: application-owned shared backgrounds for menu selection and entity/request/response field hover and focus.
  Sidebar and flyout backgrounds follow the live geometry during folding and expansion, then restore normal selection transitions so they do not trail behind icons or rows.
- `folder-icon`: adapted folder flap and paper movement for the document shortcut.
- The narrow-screen sheet in `src/styles/rare-ui.css` borrows `family-drawer` presentation while retaining the existing native dialog and focus handling.
- `animated-check`: copied Task List's circle fill, pop and check drawing for export selections, retaining native checkbox behavior without task sorting or strikethrough.
- `animated-copy-button`: shares Code Block's copy/check feedback with URL/Path, response headers and SSE messages; success follows the actual clipboard result.
- `height-transition`: adapts Web Search's measured collapse for descriptions, security metadata, schema subtrees, export service groups, mobile TOC and workflow configuration/cache; closed content is inert, native details stays open only while closing, and lazy subtrees unmount after exit.
- `editor-layout-motion`: application-owned Task List-style transitions for the shared CodeMirror editor used by model JSON, request/response examples, editable bodies and live responses. Fold and long-string actions animate visible line positions and the bounded pane height; source edits and streams stay immediate. Disclosure DOM is retained for continuous arrow rotation and keyboard focus.
- `motion-timing`: shared local adaptation timings: collapse/content 180ms, movement 220ms, feedback 120ms, with `cubic-bezier(0.2, 0.8, 0.2, 1)`; reduced motion skips transitions.
- `content-transition`: borrows Family Drawer's short content transition for search states and settings categories without remounting controls to animate them.
- `workspace-loading` (`src/components/workspace-loading.tsx`): uses Family Drawer's short entrance with the minimal ToC design, stable branding, a single real loading hint and a bounded activity line; screen and page modes share the view, and reduced motion keeps the indicator stationary.
- `use-list-motion`: application-owned positional feedback inspired by Task List; only list membership/order changes animate, keeping native tables, input focus and workflow order.
- `http-method-badge`: adapts Task List's separate fill and Hook Sidebar's restrained spring for sidebar and workspace-tab selection; badge geometry and labels stay fixed, and visible API rows no longer recenter on each switch.
- Moving backgrounds also cover select options, search results, editable parameter tables and grouped overview operation rows, including keyboard focus. Sidebar branches retain Tabler folder/folder-open glyphs with a small flap-like transition.

These files use the application's theme variables and respect `prefers-reduced-motion`.
