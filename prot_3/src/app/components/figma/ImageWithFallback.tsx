import React, { useState, useRef } from 'react'
import { api } from '../../api/client'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

const MAX_RETRIES = 3

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false)
  const retries = useRef(0)

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (retries.current < MAX_RETRIES) {
      retries.current += 1
      const img = e.currentTarget
      const original = img.src
      // Brief delay before retry so we don't hammer instantly
      setTimeout(() => { img.src = original }, 500 * retries.current)
    } else {
      api.post('/media/report-failure', { url: src, context: 'ImageWithFallback' }).catch(() => {})
      setFailed(true)
    }
  }

  const { src, alt, style, className, ...rest } = props

  return failed ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
      </div>
    </div>
  ) : (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}
