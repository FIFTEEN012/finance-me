'use client'

import { useState } from 'react'
import type { ImgHTMLAttributes } from 'react'
import { EXERCISE_MEDIA_PLACEHOLDER } from '@/lib/exerciseMedia'

type ExerciseMediaImageProps = ImgHTMLAttributes<HTMLImageElement>

export function ExerciseMediaImage({
  src,
  alt,
  onError,
  ...props
}: ExerciseMediaImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || EXERCISE_MEDIA_PLACEHOLDER)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      onError={(event) => {
        if (currentSrc !== EXERCISE_MEDIA_PLACEHOLDER) {
          setCurrentSrc(EXERCISE_MEDIA_PLACEHOLDER)
        }
        onError?.(event)
      }}
    />
  )
}
