# Feature layout

`features/` follows domain ownership rather than visual placement:

- `aggregation/`: gateway discovery, service switching, document cache and scoped workspace state.
- `documentation/`: OpenAPI workspace sources, Markdown parsing and document-page presentation.
- `export/`: OpenAPI subset selection and file generation.
- `home/`: landing workspace and feature entry points.
- `management/`: global authentication and request-parameter configuration.
- `models/`: entity-schema browsing and examples.
- `openapi/`: OpenAPI normalization, schema helpers and operation metadata.
- `playground/`: request construction, request drafts, response parsing and online-debug state.
- `security/`: OpenAPI security requirements, credentials and persisted preferences.
- `workspace/`: cross-feature navigation layout, workspace tabs and their persisted state.

Feature pages and their presentation stay in their owning directory. `src/components/` only contains cross-feature controls such as editors, viewers and menus. `App` owns document loading, Hash navigation and page-level callback wiring; isolated workspace rules live in `workspace/`.
