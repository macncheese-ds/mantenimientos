import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import LoginModal from './components/LoginModal'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Config from './pages/Config'
import { login as apiLogin } from './api'

export default function App() {
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)

  // Restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const handleLogin = async ({ employee_input, password }) => {
    setLoginBusy(true)
    try {
      const data = await apiLogin(employee_input, password)
      if (data.success) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
        setShowLogin(false)
      } else {
        throw new Error(data.message || 'Error de autenticación')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error de autenticación'
      throw new Error(msg)
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black">
        <Header
          user={user}
          onLogout={handleLogout}
          onLoginClick={() => setShowLogin(true)}
        />

        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                user={user}
                onLoginRequired={() => setShowLogin(true)}
              />
            }
          />
          <Route path="/history" element={<History />} />
          <Route path="/config" element={<Config user={user} />} />
        </Routes>

        <LoginModal
          visible={showLogin}
          onClose={() => setShowLogin(false)}
          onConfirm={handleLogin}
          busy={loginBusy}
        />
      </div>
    </BrowserRouter>
  )
}
