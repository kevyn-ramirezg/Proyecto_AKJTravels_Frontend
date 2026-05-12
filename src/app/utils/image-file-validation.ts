export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_SIZE_LABEL = '5 MB';

export function isAllowedImageType(file: File): boolean {
  return ALLOWED_IMAGE_MIME_TYPES.includes((file.type || '').toLowerCase());
}

export function isAllowedImageSize(file: File): boolean {
  return file.size <= MAX_IMAGE_SIZE_BYTES;
}

export function validateImageFile(file: File): string | null {
  if (!isAllowedImageType(file)) {
    return 'Formato de imagen no permitido. Usa JPG, PNG o WEBP.';
  }

  if (!isAllowedImageSize(file)) {
    return `La imagen no debe superar ${MAX_IMAGE_SIZE_LABEL}.`;
  }

  return null;
}
