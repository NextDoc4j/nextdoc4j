import builtInBrandLogo from '../assets/logo.png';

export interface WorkspaceLoadingProps {
  /**
   * Display mode:
   * - 'screen': OpenAPI document loading (full viewport)
   * - 'page': Route / page loading inside workspace container
   */
  mode?: 'screen' | 'page';
  /** Brand logo URL or base64. Falls back to builtInBrandLogo if not provided. */
  logo?: string;
  /** Brand title. Falls back to 'NextDoc4j' if not provided. */
  title?: string;
  /**
   * Whether the title came from custom metadata (x-nextdoc4j brand or info.title).
   * - true: displays the custom brand title.
   * - false: keeps the default NextDoc4j brand title.
   */
  hasCustomTitle?: boolean;
  /** Actual loading hint. Defaults to '正在加载接口文档'; an empty string hides it. */
  statusText?: string;
  /** Additional container classes. */
  className?: string;
}

/**
 * Displays the minimal ToC loading design with stable branding and an indeterminate activity line.
 */
export function WorkspaceLoading({
  mode = 'screen',
  logo,
  title,
  hasCustomTitle,
  statusText = '正在加载接口文档',
  className = '',
}: WorkspaceLoadingProps) {
  const rawTitle = title?.trim();
  const isCustom =
    hasCustomTitle !== undefined
      ? hasCustomTitle
      : Boolean(rawTitle && rawTitle.toLowerCase() !== 'nextdoc4j');
  const resolvedTitle = isCustom && rawTitle ? rawTitle : 'NextDoc4j';
  const resolvedLogo = logo || builtInBrandLogo;

  return (
    <div
      className={`workspace-loading-root size-${mode} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="workspace-loading-card">
        <img
          src={resolvedLogo}
          alt={resolvedTitle}
          onError={(e) => {
            if (e.currentTarget.getAttribute('src') !== builtInBrandLogo) {
              e.currentTarget.src = builtInBrandLogo;
            }
          }}
        />
      </div>
      <h1 className="workspace-loading-title">{resolvedTitle}</h1>
      {statusText && <p className="workspace-loading-sub">{statusText}</p>}
      <div className="workspace-loading-track" aria-hidden="true">
        <div className="workspace-loading-thumb" />
      </div>
    </div>
  );
}
