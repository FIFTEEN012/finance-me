import { foodPhotoItemsFrom, type FoodPhotoItem } from '@/lib/foodPhoto'

/** Server route that turns a food photo into suggested items. The photo is not stored. */
export const FOOD_PHOTO_ROUTE = '/api/nutrition/parse-food-photo'

export const FOOD_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/** Phone photos are often over the server limit, so shrink them to a JPEG first. */
async function photoForUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file
  const image = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    const maxSide = Math.max(image.width, image.height)
    let scale = maxSide > 2048 ? 2048 / maxSide : 1
    for (const quality of [0.85, 0.75, 0.65, 0.6]) {
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('ไม่สามารถเตรียมรูปนี้ได้')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return new File([blob], 'food-photo.jpg', { type: 'image/jpeg' })
      scale *= 0.85
    }
    throw new Error('รูปยังมีขนาดใหญ่เกินไป กรุณาลองรูปอื่น')
  } finally {
    image.close()
  }
}

/**
 * Sends a food photo to the server and returns the suggested items (possibly empty).
 * Throws an Error with a Thai message on any failure, including 401 when not signed in.
 */
export async function readFoodPhoto(file: File, signal?: AbortSignal): Promise<FoodPhotoItem[]> {
  if (!FOOD_PHOTO_TYPES.includes(file.type)) throw new Error('รองรับเฉพาะรูป PNG, JPEG และ WebP')
  if (file.size === 0 || file.size > MAX_ORIGINAL_BYTES) throw new Error('รูปต้องมีขนาดไม่เกิน 12 MB')
  const prepared = await photoForUpload(file)
  const form = new FormData()
  form.append('image', prepared)
  const response = await fetch(FOOD_PHOTO_ROUTE, { method: 'POST', body: form, signal })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'วิเคราะห์รูปไม่สำเร็จ')
  return foodPhotoItemsFrom(result)
}
