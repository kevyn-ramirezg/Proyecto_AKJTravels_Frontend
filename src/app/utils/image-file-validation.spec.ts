import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  isAllowedImageSize,
  isAllowedImageType,
  validateImageFile
} from './image-file-validation';

describe('image-file-validation', () => {
  function file(type: string, size: number, name = 'test-file'): File {
    const data = new Uint8Array(size);
    return new File([data], name, { type });
  }

  it('debe aceptar JPEG, PNG y WEBP', () => {
    for (const mime of ALLOWED_IMAGE_MIME_TYPES) {
      expect(isAllowedImageType(file(mime, 1024))).toBeTrue();
      expect(validateImageFile(file(mime, 1024))).toBeNull();
    }
  });

  it('debe rechazar tipos no permitidos', () => {
    const invalidTypes = ['application/pdf', 'image/gif', 'image/svg+xml', 'image/heic', 'text/plain'];

    for (const mime of invalidTypes) {
      const result = validateImageFile(file(mime, 1024));
      expect(isAllowedImageType(file(mime, 1024))).toBeFalse();
      expect(result).toContain('Formato de imagen no permitido');
    }
  });

  it('debe aceptar una imagen de exactamente 5 MB', () => {
    const validFile = file('image/png', MAX_IMAGE_SIZE_BYTES);

    expect(isAllowedImageSize(validFile)).toBeTrue();
    expect(validateImageFile(validFile)).toBeNull();
  });

  it('debe rechazar una imagen mayor a 5 MB', () => {
    const oversizedFile = file('image/png', MAX_IMAGE_SIZE_BYTES + 1);

    expect(isAllowedImageSize(oversizedFile)).toBeFalse();
    expect(validateImageFile(oversizedFile)).toContain('La imagen no debe superar 5 MB');
  });

  it('debe normalizar el tipo MIME a minúsculas', () => {
    expect(isAllowedImageType(file('IMAGE/PNG', 1024))).toBeTrue();
  });
});
