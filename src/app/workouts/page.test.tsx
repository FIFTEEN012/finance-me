import { render, screen } from '@testing-library/react'
import WorkoutsPage from './page'

vi.mock('@/store/useExerciseStore', () => ({
  useExerciseStore: () => ({
    exercises: [
      {
        id: '0001',
        name: '3/4 sit-up',
        category: 'waist',
        body_part: 'waist',
        equipment: 'body weight',
        instructions: { en: 'Test instructions' },
        instruction_steps: { en: ['Step 1'] },
        muscle_group: 'hip flexors',
        secondary_muscles: ['hip flexors'],
        target: 'abs',
        image: 'images/0001-2gPfomN.jpg',
        gif_url: 'videos/0001-2gPfomN.gif',
        created_at: '2026-03-18T12:31:32.854798+00:00',
      },
    ],
    loading: false,
    loaded: true,
    error: null,
    loadExercises: vi.fn(),
    searchExercises: () => [
      {
        id: '0001',
        name: '3/4 sit-up',
        category: 'waist',
        body_part: 'waist',
        equipment: 'body weight',
        instructions: { en: 'Test instructions' },
        instruction_steps: { en: ['Step 1'] },
        muscle_group: 'hip flexors',
        secondary_muscles: ['hip flexors'],
        target: 'abs',
        image: 'images/0001-2gPfomN.jpg',
        gif_url: 'videos/0001-2gPfomN.gif',
        created_at: '2026-03-18T12:31:32.854798+00:00',
      },
    ],
    getExerciseById: vi.fn(),
    getImageUrl: () => 'https://static.exercisedb.dev/media/2gPfomN.gif',
    getGifUrl: () => 'https://static.exercisedb.dev/media/2gPfomN.gif',
    getBodyParts: () => ['waist'],
    getEquipmentList: () => ['body weight'],
  }),
}))

vi.mock('@/store/useWorkoutStore', () => ({
  useWorkoutStore: () => ({
    activeSession: null,
    startWorkout: vi.fn(),
    addExerciseToActive: vi.fn(),
    sessions: [],
    addSet: vi.fn(),
    removeSet: vi.fn(),
    updateSet: vi.fn(),
    toggleSetDone: vi.fn(),
    removeExerciseFromActive: vi.fn(),
    finishWorkout: vi.fn(),
    cancelWorkout: vi.fn(),
  }),
}))

describe('WorkoutsPage media', () => {
  it('renders exercise cards with the resolved ExerciseDB CDN gif url', () => {
    render(<WorkoutsPage />)

    expect(screen.getByAltText('3/4 sit-up')).toHaveAttribute(
      'src',
      'https://static.exercisedb.dev/media/2gPfomN.gif'
    )
  })
})
