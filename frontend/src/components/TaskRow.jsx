import React from 'react'
import { Check } from 'lucide-react'
import PhotoUpload from './PhotoUpload'
import { frequencyLabels, frequencyColors } from './CycleIndicator'

export default function TaskRow({ task, recordId, onComplete, onUploadPhoto, disabled }) {
  const isCompleted = task.completion?.completed
  const [localCompleted, setLocalCompleted] = React.useState(isCompleted || false)
  const [toggling, setToggling] = React.useState(false)

  React.useEffect(() => {
    setLocalCompleted(task.completion?.completed || false)
  }, [task.completion?.completed])

  const handleToggle = async () => {
    if (disabled || toggling) return
    const newState = !localCompleted
    setLocalCompleted(newState)
    setToggling(true)
    try {
      await onComplete(task.id, newState)
    } catch (err) {
      setLocalCompleted(!newState) // revert
      console.error('Error toggling task:', err)
    } finally {
      setToggling(false)
    }
  }

  const beforePhoto = task.photos?.find(p => p.photo_type === 'before')
  const afterPhoto = task.photos?.find(p => p.photo_type === 'after')

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
      localCompleted ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-neutral-900/30 border border-transparent hover:border-neutral-800/50'
    }`}>
      {/* Checkbox */}
      <div
        className={`custom-checkbox ${localCompleted ? 'checked' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        onClick={handleToggle}
      >
        {localCompleted && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>

      {/* Task info */}
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

      {/* Photos */}
      {recordId && (
        <div className="flex items-center gap-2">
          <PhotoUpload
            photoType="before"
            photo={beforePhoto}
            onUpload={(type, file) => onUploadPhoto(task.id, type, file)}
            disabled={disabled}
          />
          <PhotoUpload
            photoType="after"
            photo={afterPhoto}
            onUpload={(type, file) => onUploadPhoto(task.id, type, file)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
