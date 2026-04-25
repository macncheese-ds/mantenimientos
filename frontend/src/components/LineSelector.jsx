import React from 'react'
import { Factory, ChevronRight, CheckCircle2, Clock } from 'lucide-react'

export default function LineSelector({ lines, records, onSelect, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card rounded-xl p-5 border border-neutral-800/50 animate-pulse">
            <div className="h-6 bg-neutral-800 rounded w-24 mb-3"></div>
            <div className="h-4 bg-neutral-800 rounded w-32 mb-2"></div>
            <div className="h-3 bg-neutral-800 rounded w-20"></div>
          </div>
        ))}
      </div>
    )
  }

  const lineColors = [
    { gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    { gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    { gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
    { gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/20', bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {lines.map((line, idx) => {
        const colors = lineColors[idx % lineColors.length]
        const record = records?.find(r => r.line_id === line.id)
        const isCompleted = record?.status === 'completed'

        return (
          <button
            key={line.id}
            id={`line-card-${line.id}`}
            onClick={() => onSelect(line)}
            className="glass-card card-hover rounded-xl p-5 border border-neutral-800/50 text-left group relative overflow-hidden"
          >
            {/* Gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                <Factory className={`w-5 h-5 ${colors.text}`} />
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 transition-colors group-hover:translate-x-0.5 transform transition-transform" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{line.name}</h3>

            {record ? (
              <div className="flex items-center gap-1.5 mt-2">
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Completado</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-400 font-medium">En progreso</span>
                    {record.completed_tasks !== undefined && (
                      <span className="text-xs text-neutral-500 ml-1">({record.completed_tasks} tareas)</span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 mt-2">Sin mantenimiento esta semana</p>
            )}
          </button>
        )
      })}
    </div>
  )
}
