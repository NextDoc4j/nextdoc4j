type SourceKind = 'json' | 'raw' | 'xml';

/**
 * Escapes text before placing it in XML text or attribute content.
 * @param value Scalar value to serialize.
 * @returns XML-safe text without changing the underlying value.
 */
function escapeXml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\r', '&#13;')
    .replaceAll('\n', '&#10;')
    .replaceAll('\t', '&#9;');
}

/**
 * Encodes JSON keys that cannot be used as XML element names.
 * @param name Original JSON key.
 * @returns A reversible XML name, including for empty or punctuation-containing keys.
 */
function encodeXmlName(name: string): string {
  if (!name) return '_x_';
  let offset = 0;
  return [...name]
    .map((character, index) => {
      const literalEscape =
        character === '_' && (name === '_x_' || /^_x[\da-f]{4,6}_/iu.test(name.slice(offset)));
      offset += character.length;
      return !literalEscape && (index === 0 ? /[A-Za-z_]/u : /[\w.-]/u).test(character)
        ? character
        : `_x${character.codePointAt(0)!.toString(16).padStart(4, '0')}_`;
    })
    .join('');
}

/**
 * Restores a JSON key encoded for XML serialization.
 * @param name XML element name.
 * @returns The original key, while leaving ordinary XML names unchanged.
 */
function decodeXmlName(name: string): string {
  return name === '_x_'
    ? ''
    : name.replace(/_x([\da-f]{4,6})_/giu, (match, code: string) => {
        const point = parseInt(code, 16);
        return point <= 0x10ffff ? String.fromCodePoint(point) : match;
      });
}

/**
 * Serializes JSON data as readable XML without adding transport-only type attributes.
 * @param value JSON value, including arrays, null and empty containers.
 * @param name Root or child element name.
 * @param depth Current indentation level.
 * @returns A complete escaped XML element for the value.
 */
export function jsonToXml(value: unknown, name = 'request', depth = 0): string {
  const tag = encodeXmlName(name);
  const padding = '  '.repeat(depth);
  if (value === null) return `${padding}<${tag}/>`;
  if (typeof value !== 'object') return `${padding}<${tag}>${escapeXml(value)}</${tag}>`;
  const entries = Array.isArray(value)
    ? value.map((item) => ['item', item] as const)
    : Object.entries(value as Record<string, unknown>);
  const attributeEntries = entries.filter(
    ([key, item]) => key.startsWith('@') && (item === null || typeof item !== 'object'),
  );
  const attributes = attributeEntries
    .map(([key, item]) => ` ${encodeXmlName(key.slice(1))}="${escapeXml(item)}"`)
    .join('');
  const text = entries.find(
    ([key, item]) => key === '#text' && (item === null || typeof item !== 'object'),
  );
  const children = entries.filter((entry) => !attributeEntries.includes(entry) && entry !== text);
  if (!children.length)
    return `${padding}<${tag}${attributes}>${text ? escapeXml(text[1]) : ''}</${tag}>`;
  if (text)
    return `${padding}<${tag}${attributes}>${escapeXml(text[1])}${children.map(([key, item]) => jsonToXml(item, key)).join('')}</${tag}>`;
  return `${padding}<${tag}${attributes}>\n${children.map(([key, item]) => jsonToXml(item, key, depth + 1)).join('\n')}\n${padding}</${tag}>`;
}

/**
 * Parses XML scalar text using its preceding JSON value as a type hint where available.
 * @param text XML text content.
 * @param hint Previous JSON value for this node.
 * @returns A typed scalar without coercing known strings or unsafe large integers.
 */
function readXmlScalar(text: string, hint: unknown): unknown {
  if (typeof hint === 'string') return text;
  if (hint === null && (!text || text.trim() === 'null')) return null;
  const trimmed = text.trim();
  if (trimmed === 'true' || (typeof hint === 'boolean' && trimmed === '1')) return true;
  if (trimmed === 'false' || (typeof hint === 'boolean' && trimmed === '0')) return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/iu.test(trimmed)) {
    const number = Number(trimmed);
    if (Number.isFinite(number) && (!Number.isInteger(number) || Number.isSafeInteger(number)))
      return number;
  }
  return text;
}

/**
 * Reads one XML node, retaining array shape and string types from an earlier JSON representation.
 * @param element Current XML element.
 * @param hint Previous JSON value or schema-derived example for this element.
 * @returns Its JSON representation; attributes use @name and mixed text uses #text.
 */
function readXmlElement(element: Element, hint: unknown): unknown {
  const children = [...element.children];
  const objectHint =
    hint && typeof hint === 'object' && !Array.isArray(hint)
      ? (hint as Record<string, unknown>)
      : undefined;
  const attributes = Object.fromEntries(
    [...element.attributes].map((attribute) => {
      const key = `@${decodeXmlName(attribute.name)}`;
      return [key, readXmlScalar(attribute.value, objectHint?.[key])];
    }),
  );
  const text = [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE)
    .map((node) => node.textContent ?? '')
    .join('');
  if (!children.length) {
    if (Object.keys(attributes).length || (objectHint && Object.hasOwn(objectHint, '#text')))
      return {
        ...attributes,
        ...(text || (objectHint && Object.hasOwn(objectHint, '#text'))
          ? { '#text': readXmlScalar(text, objectHint?.['#text']) }
          : {}),
      };
    if (Array.isArray(hint)) return text ? [readXmlScalar(text, hint[0])] : [];
    if (objectHint && !text.trim()) return {};
    return readXmlScalar(text, hint);
  }
  if (
    children.every((child) => child.tagName === 'item') &&
    !Object.keys(attributes).length &&
    (Array.isArray(hint) || hint === undefined)
  ) {
    return children.map((child, index) =>
      readXmlElement(
        child,
        Array.isArray(hint) ? (index < hint.length ? hint[index] : hint[0]) : undefined,
      ),
    );
  }
  const groups = new Map<string, Element[]>();
  children.forEach((child) => {
    const key = decodeXmlName(child.tagName);
    groups.set(key, [...(groups.get(key) ?? []), child]);
  });
  return {
    ...attributes,
    ...Object.fromEntries(
      [...groups].map(([key, items]) => {
        const childHint = objectHint?.[key];
        return [
          key,
          items.length > 1
            ? items.map((child, index) =>
                readXmlElement(
                  child,
                  Array.isArray(childHint)
                    ? index < childHint.length
                      ? childHint[index]
                      : childHint[0]
                    : undefined,
                ),
              )
            : readXmlElement(items[0], childHint),
        ];
      }),
    ),
    ...(text.trim() ||
    (objectHint && Object.hasOwn(objectHint, '#text') && typeof objectHint['#text'] !== 'object')
      ? { '#text': readXmlScalar(text, objectHint?.['#text']) }
      : {}),
  };
}

/**
 * Validates XML while distinguishing parser diagnostics from ordinary fields named parsererror.
 * @param source Complete XML source.
 * @returns Parsed document, or throws when the browser reports malformed XML.
 */
function parseXmlDocument(source: string): XMLDocument {
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (
    !document.documentElement ||
    document.getElementsByTagNameNS(
      'http://www.mozilla.org/newlayout/xml/parsererror.xml',
      'parsererror',
    ).length
  )
    throw new Error('XML 格式无效');
  return document;
}

/**
 * Converts XML into the JSON value carried by its root element.
 * @param source Complete XML source.
 * @param hint Previous JSON data or schema example used to preserve ambiguous scalar/container types.
 * @returns Parsed JSON data, or throws for malformed XML.
 */
export function xmlToJson(source: string, hint?: unknown): unknown {
  const document = parseXmlDocument(source);
  return readXmlElement(document.documentElement, hint);
}

/**
 * Converts the current structured source when switching JSON, XML and raw modes.
 * @param source Complete current source, including raw JSON or raw XML.
 * @param from Current mode, used to distinguish invalid JSON from plain raw text.
 * @param to Destination mode.
 * @param hint Most recent JSON representation or a schema example for XML type preservation.
 * @returns Converted source plus the current JSON representation for the next round trip.
 */
export function convertBodySource(
  source: string,
  from: SourceKind,
  to: SourceKind,
  hint?: unknown,
): { text: string; value: unknown } {
  let isXml = from === 'xml' || (from === 'raw' && source.trimStart().startsWith('<'));
  let value: unknown;
  if (isXml) {
    try {
      value = xmlToJson(source, hint);
    } catch (error) {
      if (from !== 'raw') throw error;
      value = source;
      isXml = false;
    }
  } else if (from === 'json') value = JSON.parse(source);
  else {
    try {
      value = JSON.parse(source);
    } catch {
      value = source;
    }
  }
  if (to === 'raw') return { value, text: source };
  if (to === 'json') return { value, text: JSON.stringify(value, null, 2) };
  const text = isXml
    ? formatPlaygroundXml(source)
    : `<?xml version="1.0" encoding="UTF-8"?>\n${jsonToXml(value)}`;
  parseXmlDocument(text);
  return { value, text };
}

/**
 * Formats XML with indentation after validating the complete document.
 *
 * @param value XML source entered in the request body.
 * @returns A readable XML document, or throws when parsing fails.
 */
export function formatPlaygroundXml(value: string): string {
  const document = parseXmlDocument(value);

  /**
   * Serializes one DOM node while preserving mixed-content elements inline.
   *
   * @param node XML node to serialize.
   * @param depth Current indentation depth.
   * @returns Formatted XML for the current node.
   */
  const serialize = (node: Node, depth = 0): string => {
    const padding = '  '.repeat(depth);
    if (!(node instanceof Element))
      return `${padding}${new XMLSerializer().serializeToString(node)}`;
    const children = [...node.childNodes].filter(
      (child) => child.nodeType !== Node.TEXT_NODE || child.textContent?.trim(),
    );
    const hasElements = children.some((child) => child instanceof Element);
    const hasText = children.some(
      (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
    );
    if (!hasElements || hasText) return `${padding}${new XMLSerializer().serializeToString(node)}`;
    const opening = new XMLSerializer()
      .serializeToString(node.cloneNode(false))
      .replace(/\s*\/>$/u, '>');
    return `${padding}${opening}\n${children
      .map((child) => serialize(child, depth + 1))
      .join('\n')}\n${padding}</${node.tagName}>`;
  };

  const declaration = value.trimStart().startsWith('<?xml')
    ? '<?xml version="1.0" encoding="UTF-8"?>\n'
    : '';
  return `${declaration}${serialize(document.documentElement)}`;
}
