import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Application } from '@/app/Application'
import './index.css'

if (import.meta.env.VITE_APP_TITLE) document.title = import.meta.env.VITE_APP_TITLE

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <Application />
  </StrictMode>,
)
