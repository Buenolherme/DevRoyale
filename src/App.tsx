import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthProvider'
import { PresenceProvider } from '@/contexts/PresenceProvider'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { router } from '@/routes'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PresenceProvider>
          <RouterProvider router={router} />
        </PresenceProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
