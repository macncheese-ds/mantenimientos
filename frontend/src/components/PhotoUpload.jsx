import React from 'react'
import { Camera, ImageIcon, X } from 'lucide-react'
import { API_BASE_URL } from '../api'

export default function PhotoUpload({ photoType, photo, onUpload, disabled }) {
  const inputRef = React.useRef(null)
  const [preview, setPreview] = React.useState(null)
  const [showLightbox, setShowLightbox] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const label = photoType === 'before' ? 'Antes' : 'Después'

  const existingUrl = photo ? `${API_BASE_URL}${photo.file_path}` : null

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Show local preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    // Upload
    setUploading(true)
    try {
      await onUpload(photoType, file)
    } catch (err) {
      console.error('Error uploading photo:', err)
    } finally {
      setUploading(false)
    }
  }

  const displayUrl = preview || existingUrl

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">{label}</span>

      {displayUrl ? (
        <div className="relative group">
          <img
            src={displayUrl}
            alt={label}
            className="photo-thumb"
            onClick={() => setShowLightbox(true)}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {!disabled && (
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Cambiar foto"
            >
              <Camera className="w-3 h-3 text-neutral-300" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-16 h-16 rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-500 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-neutral-500/30 border-t-neutral-400 rounded-full animate-spin" />
          ) : (
            <>
              <Camera className="w-4 h-4 text-neutral-500" />
              <span className="text-[9px] text-neutral-600">Foto</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {/* Lightbox */}
      {showLightbox && displayUrl && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4 animate-fade-in"
          onClick={() => setShowLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-lg bg-neutral-800/80 text-white hover:bg-neutral-700 transition-all"
            onClick={() => setShowLightbox(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={displayUrl}
            alt={label}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
