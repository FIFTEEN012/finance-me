'use client'

import { create } from 'zustand'
import type { ExerciseData } from '@/types/workout'

const GITHUB_RAW = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main'

interface ExerciseStore {
  exercises: ExerciseData[]
  loading: boolean
  loaded: boolean
  error: string | null
  loadExercises: () => Promise<void>
  searchExercises: (query: string, bodyPart?: string, equipment?: string) => ExerciseData[]
  getExerciseById: (id: string) => ExerciseData | undefined
  getImageUrl: (imagePath: string) => string
  getGifUrl: (gifPath: string) => string
  getBodyParts: () => string[]
  getEquipmentList: () => string[]
}

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  exercises: [],
  loading: false,
  loaded: false,
  error: null,

  loadExercises: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true, error: null })
    try {
      const res = await fetch('/data/exercises.json')
      if (!res.ok) throw new Error('Failed to load exercises')
      const data: ExerciseData[] = await res.json()
      set({ exercises: data, loaded: true, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  searchExercises: (query, bodyPart, equipment) => {
    const { exercises } = get()
    const q = query.toLowerCase().trim()
    return exercises.filter((ex) => {
      if (q && !ex.name.toLowerCase().includes(q) && !ex.target.toLowerCase().includes(q)) return false
      if (bodyPart && ex.body_part !== bodyPart) return false
      if (equipment && ex.equipment !== equipment) return false
      return true
    })
  },

  getExerciseById: (id) => get().exercises.find((e) => e.id === id),

  getImageUrl: (imagePath) => {
    const filename = imagePath.split('/').pop() || ''
    const filenameNoExt = filename.substring(0, filename.lastIndexOf('.'))
    const mediaId = filenameNoExt.split('-')[1]
    if (!mediaId) return `${GITHUB_RAW}/${imagePath}`
    return `https://static.exercisedb.dev/media/${mediaId}.gif`
  },
  getGifUrl: (gifPath) => {
    const filename = gifPath.split('/').pop() || ''
    const filenameNoExt = filename.substring(0, filename.lastIndexOf('.'))
    const mediaId = filenameNoExt.split('-')[1]
    if (!mediaId) return `${GITHUB_RAW}/${gifPath}`
    return `https://static.exercisedb.dev/media/${mediaId}.gif`
  },

  getBodyParts: () => {
    const parts = new Set(get().exercises.map((e) => e.body_part))
    return Array.from(parts).sort()
  },

  getEquipmentList: () => {
    const equips = new Set(get().exercises.map((e) => e.equipment))
    return Array.from(equips).sort()
  },
}))
