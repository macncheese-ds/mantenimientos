import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Cpu } from 'lucide-react'
import TaskRow from './TaskRow'

export default function MachineCard({ machine, recordId, onComplete, onUploadPhoto, disabled }) {
  const [expanded, setExpanded] = useState(true)

  const tasks = machine.tasks || []
  const completedCount = tasks.filter(t => t.completion?.completed).length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const allDone = completedCount === totalCount && totalCount > 0

  return (
    <div className={`glass-card rounded-xl border overflow-hidden transition-all ${
      allDone ? 'border-emerald-500/20' : 'border-neutral-800/50'
    }`}>
      {/* Machine header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-neutral-900/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            allDone ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-neutral-800 border border-neutral-700/50'
          }`}>
            <Cpu className={`w-5 h-5 ${allDone ? 'text-emerald-400' : 'text-neutral-400'}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">{machine.name}</h3>
            <p className="text-xs text-neutral-500">
              {completedCount} / {totalCount} tareas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress */}
          <div className="hidden sm:block w-32">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className={`text-xs font-mono ${allDone ? 'text-emerald-400' : 'text-neutral-500'}`}>
            {Math.round(progress)}%
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          )}
        </div>
      </button>

      {/* Progress bar mobile */}
      <div className="sm:hidden px-4 pb-2">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Tasks */}
      {expanded && tasks.length > 0 && (
        <div className="px-3 pb-3 space-y-1 border-t border-neutral-800/30">
          <div className="pt-2">
            {tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                recordId={recordId}
                onComplete={onComplete}
                onUploadPhoto={onUploadPhoto}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {expanded && tasks.length === 0 && (
        <div className="px-4 pb-4 text-sm text-neutral-600 text-center">
          No hay tareas para esta máquina en el ciclo actual
        </div>
      )}
    </div>
  )
}
