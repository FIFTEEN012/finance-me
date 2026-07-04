import { EXERCISE_MEDIA_PLACEHOLDER, getExerciseMediaToken, resolveExerciseMediaUrl } from './exerciseMedia'

describe('exercise media helpers', () => {
  it('extracts the ExerciseDB media token from dataset image paths', () => {
    expect(getExerciseMediaToken('images/0001-2gPfomN.jpg')).toBe('2gPfomN')
    expect(getExerciseMediaToken('videos/0001-2gPfomN.gif')).toBe('2gPfomN')
  })

  it('resolves dataset references to the ExerciseDB CDN gif url', () => {
    expect(resolveExerciseMediaUrl('images/0001-2gPfomN.jpg')).toBe(
      'https://static.exercisedb.dev/media/2gPfomN.gif'
    )
    expect(resolveExerciseMediaUrl('videos/0001-2gPfomN.gif')).toBe(
      'https://static.exercisedb.dev/media/2gPfomN.gif'
    )
  })

  it('falls back to the placeholder when the dataset path is missing or invalid', () => {
    expect(resolveExerciseMediaUrl('')).toBe(EXERCISE_MEDIA_PLACEHOLDER)
    expect(resolveExerciseMediaUrl('broken-path')).toBe(EXERCISE_MEDIA_PLACEHOLDER)
  })
})
