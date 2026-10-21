import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import type { ComponentProps } from 'react';

type DocumentationImageProps = Omit<ComponentProps<'img'>, 'src'> & {
  src?: ComponentProps<typeof ImageZoom>['src'] | Blob;
};

/** Shared edge-to-edge frame for ordinary Markdown images. */
export function DocumentationImage({ src, ...props }: DocumentationImageProps) {
  return (
    <span className="nd-doc-image not-prose">
      {src instanceof Blob ? <img {...props} src={src} /> : <ImageZoom {...props} src={src} />}
    </span>
  );
}

/** Uses the site's selected theme, including a manual override of the system theme. */
export function ThemedScreenshot({ light, dark, alt, width = 1440, height = 960 }: {
  light: string;
  dark: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure
      className="nd-doc-image nd-doc-image--wide not-prose"
      style={{ maxWidth: width, marginInline: 'auto' }}
    >
      <div className="dark:hidden">
        <ImageZoom src={light} alt={alt} width={width} height={height} loading="lazy" />
      </div>
      <div className="hidden dark:block">
        <ImageZoom src={dark} alt={alt} width={width} height={height} loading="lazy" />
      </div>
    </figure>
  );
}
