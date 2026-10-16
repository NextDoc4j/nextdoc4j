/**
 * Downloads a browser-supported export file without a third-party UI dependency.
 *
 * @param blob Export data and its MIME type.
 * @param fileName Target filename presented by the browser download dialog.
 * @returns Nothing after releasing the temporary object URL.
 */
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement('a');
  anchor.download = fileName;
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
};

/**
 * Opens an export-ready HTML document in the browser print dialog for PDF output.
 *
 * @param html Printable standalone HTML generated from the current document.
 * @returns True when the browser opened a printable window, otherwise false.
 */
export const printHtml = (html: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.opener = null;
  printWindow.document.write(html);
  printWindow.document.close();
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  });
  return true;
};
