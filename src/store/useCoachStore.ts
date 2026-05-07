'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id:        string
  role:      'user' | 'assistant'
  content:   string
  createdAt: string
}

interface CoachStore {
  messages:    ChatMessage[]
  addMessage:  (msg: Omit<ChatMessage, 'id' | 'createdAt'>) => ChatMessage
  updateLast:  (content: string) => void
  clearChat:   () => void
}

export const useCoachStore = create<CoachStore>()(
  persist(
    (set, get) => ({
      messages: [],

      addMessage: (msg) => {
        const full: ChatMessage = {
          ...msg,
          id:        crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ messages: [...s.messages, full] }))
        return full
      },

      updateLast: (content) =>
        set((s) => {
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content }
          }
          return { messages: msgs }
        }),

      clearChat: () => set({ messages: [] }),
    }),
    { name: 'finance-coach-chat' }
  )
)
