/**
 * Shared client-side helpers for the image tool components.
 * Everything runs in the browser; no file ever leaves the device.
 */

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface LoadedImage {
  img: HTMLImageElement;
  /** Object URL backing the image — call revoke() when replacing it. */
  url: string;
  revoke: () => void;
}

export function loadImageFromFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url, revoke: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Not a readable image'));
    };
    img.src = url;
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))),
      type,
      quality,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

/** Extension + mime helpers for naming downloads. */
export function extForMime(mime: string): string {
  return (
    { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[
      mime
    ] ?? 'png'
  );
}

export function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '') || 'image';
}

/** Flatten transparency onto white (required for JPEG output). */
export function flattenForJpeg(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const flat = document.createElement('canvas');
  flat.width = canvas.width;
  flat.height = canvas.height;
  const ctx = flat.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(canvas, 0, 0);
  return flat;
}

/** Scale an image so its longest edge fits maxDim; returns a canvas. */
export function imageToCanvas(img: HTMLImageElement, maxDim?: number): HTMLCanvasElement {
  const scale = maxDim ? Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight)) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Wires a dropzone element: click-to-browse, drag-drop, and clipboard paste. */
export function wireDropzone(
  zone: HTMLElement,
  fileInput: HTMLInputElement,
  onFile: (file: File) => void,
): void {
  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) onFile(file);
    fileInput.value = '';
  });
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('border-pine');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('border-pine'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('border-pine');
    const file = e.dataTransfer?.files?.[0];
    if (file) onFile(file);
  });
  document.addEventListener('paste', (e) => {
    if (!zone.isConnected) return;
    const file = [...(e.clipboardData?.files ?? [])][0];
    if (file && file.type.startsWith('image/')) onFile(file);
  });
}
