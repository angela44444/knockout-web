import { createRoot } from 'react-dom/client'
import App from './App'

const root = document.getElementById('ko-root')
if (root) {
  createRoot(root).render(<App />)
}
