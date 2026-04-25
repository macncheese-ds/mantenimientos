import React from 'react'
import { Wrench, History, Settings, LogOut, User } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Header({ user, onLogout, onLoginClick }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Mantenimiento', icon: Wrench },
    { path: '/history', label: 'Historial', icon: History },
    { path: '/config', label: 'Configuración', icon: Settings },
  ]

  return (
    <header className="glass-card border-b border-neutral-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Mantenimiento</h1>
              <p className="text-[11px] text-neutral-500 leading-tight">Control de Máquinas</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              // Only show config to admin users
              if (path === '/config' && (!user || user.rol !== 'admin')) return null
              const isActive = location.pathname === path
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              )
            })}
          </nav>

          {/* User */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-neutral-200">{user.nombre}</p>
                  <p className="text-[11px] text-neutral-500">{user.num_empleado} · {user.rolOriginal || user.rol}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700/50 flex items-center justify-center">
                  <User className="w-4 h-4 text-neutral-400" />
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50 transition-all"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-all"
              >
                <User className="w-4 h-4" />
                Ingresar
              </button>
            )}
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="sm:hidden flex items-center gap-1 pb-3 -mt-1 overflow-x-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            if (path === '/config' && (!user || user.rol !== 'admin')) return null
            const isActive = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
