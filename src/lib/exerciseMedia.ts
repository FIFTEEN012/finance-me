const EXERCISE_MEDIA_BASE_URL = 'https://static.exercisedb.dev/media'

export const EXERCISE_MEDIA_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' rx='24' fill='%23f3f4f6'/%3E%3Cpath d='M110 164c18-31 37-47 50-47 16 0 29 11 50 47' fill='none' stroke='%239ca3af' stroke-width='12' stroke-linecap='round'/%3E%3Ccircle cx='160' cy='92' r='24' fill='%23d1d5db'/%3E%3Ctext x='160' y='208' text-anchor='middle' font-family='Arial, sans-serif' font-size='20' fill='%236b7280'%3EExercise preview%3C/text%3E%3C/svg%3E"

export function getExerciseMediaToken(path: string | null | undefined): string | null {
  if (!path) return null

  const filename = path.split('/').pop()
  if (!filename) return null

  const extensionIndex = filename.lastIndexOf('.')
  if (extensionIndex <= 0) return null

  const filenameWithoutExtension = extensionIndex >= 0 ? filename.slice(0, extensionIndex) : filename
  const parts = filenameWithoutExtension.split('-')
  if (parts.length < 2) return null

  const token = parts.pop()?.trim()

  if (!token || token === filenameWithoutExtension) return null

  return /^[A-Za-z0-9]+$/.test(token) ? token : null
}

export function resolveExerciseMediaUrl(path: string | null | undefined): string {
  const token = getExerciseMediaToken(path)
  return token ? `${EXERCISE_MEDIA_BASE_URL}/${token}.gif` : EXERCISE_MEDIA_PLACEHOLDER
}
