import { fireEvent, render, screen } from '@testing-library/react'
import { ExerciseMediaImage } from './ExerciseMediaImage'
import { EXERCISE_MEDIA_PLACEHOLDER } from '@/lib/exerciseMedia'

describe('ExerciseMediaImage', () => {
  it('renders the provided media source on first render', () => {
    render(<ExerciseMediaImage src="https://static.exercisedb.dev/media/2gPfomN.gif" alt="Push Up" />)

    expect(screen.getByAltText('Push Up')).toHaveAttribute(
      'src',
      'https://static.exercisedb.dev/media/2gPfomN.gif'
    )
  })

  it('falls back to the placeholder when the media source fails to load', () => {
    render(<ExerciseMediaImage src="https://static.exercisedb.dev/media/missing.gif" alt="Missing" />)

    const image = screen.getByAltText('Missing')
    fireEvent.error(image)

    expect(image).toHaveAttribute('src', EXERCISE_MEDIA_PLACEHOLDER)
  })
})
