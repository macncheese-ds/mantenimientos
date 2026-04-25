import React from 'react'
import { Check, MessageSquare } from 'lucide-react'
import PhotoUpload from './PhotoUpload'
import { frequencyLabels, frequencyColors } from './CycleIndicator'

export default function TaskRow({ task, recordId, localCompleted, localNotes, onToggle, onUpdateNotes, onUploadPhoto, disabled }) {
  const beforePhoto = task.photos?.find(p => p.photo_type === 'before')
  const afterPhoto = task.photos?.find(p => p.photo_type === 'after')
  const showNotesField = !localCompleted // Show notes field when task is NOT completed

  return (
    <div className={`p-3 rounded-lg transition-all mb-1 ${localCompleted ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-neutral-900/30 border border-transparent hover:border-neutral-800/50'}`}>
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <div className={`custom-checkbox ${localCompleted ? 'checked' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          onClick={() => { if (!disabled) onToggle(task.id, !localCompleted) }}>
          {localCompleted && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </div>

        {/* Task description */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${localCompleted ? 'text-neutral-400 line-through' : 'text-neutral-200'}`}>
            {task.description}
          </p>
          {task.completion?.completed_at && (
            <p className="text-[10px] text-neutral-600 mt-0.5">
              Completada por {task.completion.completed_by} · {new Date(task.completion.completed_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Frequency badge */}
        <span className={`badge ${frequencyColors[task.frequency]} hidden sm:inline-flex`}>
          {frequencyLabels[task.frequency]}
        </span>

        {/* Photos — always required */}
        {recordId && (
          <div className="flex items-center gap-2">
            <PhotoUpload photoType="before" photo={beforePhoto}
              onUpload={(type, file) => onUploadPhoto(task.id, type, file)} disabled={disabled} />
            <PhotoUpload photoType="after" photo={afterPhoto}
              onUpload={(type, file) => onUploadPhoto(task.id, type, file)} disabled={disabled} />
          </div>
        )}
      </div>

      {/* Notes field — required when NOT completed */}
      {showNotesField && recordId && !disabled && (
        <div className="mt-2 ml-9 flex items-start gap-2">
          <MessageSquare className="w-4 h-4 text-amber-500 mt-1.5 flex-shrink-0" />
          <div className="flex-1">
            <textarea
              value={localNotes}
              onChange={e => onUpdateNotes(task.id, e.target.value)}
              placeholder="Comentario obligatorio si no se completó — explique la razón y suba foto del problema"
              className="w-full bg-neutral-900/50 border border-amber-500/30 text-white px-3 py-2 rounded-lg text-xs resize-none h-16 placeholder-neutral-600 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
