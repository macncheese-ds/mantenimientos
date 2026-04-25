import React from 'react'
import { Calendar, AlertTriangle } from 'lucide-react'

const frequencyLabels = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  semiannual: 'Semestral',
  annual: 'Anual',
}

const frequencyColors = {
  weekly: 'badge-weekly',
  monthly: 'badge-monthly',
  semiannual: 'badge-semiannual',
  annual: 'badge-annual',
}

export default function CycleIndicator({ cycle, loading }) {
  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4 border border-neutral-800/50 animate-pulse">
        <div className="h-5 bg-neutral-800 rounded w-48 mb-2"></div>
        <div className="h-4 bg-neutral-800 rounded w-32"></div>
      </div>
    )
  }

  if (!cycle) {
    return (
      <div className="glass-card rounded-xl p-4 border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">No se pudo obtener el ciclo actual</span>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-xl p-4 border border-neutral-800/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Semana {cycle.weekNumber}</h2>
              <span className="text-sm text-neutral-500">/ {cycle.year}</span>
            </div>
            <p className="text-xs text-neutral-400">
              {cycle.weekStart} — {cycle.weekEnd}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500 mr-1">Activas:</span>
          {cycle.frequencies.map(freq => (
            <span key={freq} className={`badge ${frequencyColors[freq]}`}>
              {frequencyLabels[freq]}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export { frequencyLabels, frequencyColors }
