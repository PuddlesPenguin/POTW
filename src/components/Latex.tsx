import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MathJax } from 'better-react-mathjax'

type Props = { children: ReactNode }

const mathMarkupPattern = /(\$\$|\$[^$]+\$|\\\[|\\\(|\\begin\{)/

// MathJax loads asynchronously. If a render pass happens before it is ready,
// remount the expression a couple of times so the client can recover without
// requiring a full page refresh.
export default function Latex({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const source = typeof children === 'string' ? children : ''
  const [retry, setRetry] = useState({ source, attempt: 0 })
  const attempt = retry.source === source ? retry.attempt : 0

  useEffect(() => {
    if (!mathMarkupPattern.test(source) || attempt >= 2) return

    const timer = window.setTimeout(() => {
      const rendered = containerRef.current?.querySelector('mjx-container, .MathJax')
      if (!rendered) {
        setRetry((current) => current.source === source
          ? { source, attempt: current.attempt + 1 }
          : { source, attempt: 1 })
      }
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [attempt, source])

  return (
    <div ref={containerRef}>
      <MathJax key={`${source}-${attempt}`} dynamic>{children}</MathJax>
    </div>
  )
}
