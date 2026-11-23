import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

export function useAnimatedNumber(target: number, duration = 0.8): number {
  const [value, setValue] = useState(target)
  const currentRef = useRef(target)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) {
      currentRef.current = target
      setValue(target)
      return
    }
    const controls = animate(currentRef.current, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        currentRef.current = latest
        setValue(latest)
      },
    })
    return () => controls.stop()
  }, [target, duration, reducedMotion])

  return value
}
