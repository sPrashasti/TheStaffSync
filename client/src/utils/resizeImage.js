// Turns a chosen image file into a small square JPEG for a profile photo: the centre square of the
// picture, scaled to `size` pixels. Keeps uploads to a few tens of kilobytes whatever the camera.
export const PHOTO_SIZE = 320;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export const resizeToSquareJpeg = async (file, size = PHOTO_SIZE) => {
  if (!ACCEPTED.includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That image is too large. Choose one under 15 MB.');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That file could not be read as an image.');
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be prepared.'))), 'image/jpeg', 0.86);
  });
};
