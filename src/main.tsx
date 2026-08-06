import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'

import { AppRoutes } from './AppRoutes'
import { Layout } from './layout'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  </StrictMode>,
)
