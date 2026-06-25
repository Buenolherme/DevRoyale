import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { router } from '@/routes'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
