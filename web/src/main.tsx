import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './app/queryClient'
import { ConfigProvider } from 'antd'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>
  </StrictMode>,
)
