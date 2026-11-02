import { useEffect, useState } from 'react'
export function useVisible() {
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const fn = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [])
  return visible
}
