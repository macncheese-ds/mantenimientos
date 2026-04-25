import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Play, Save, ShieldCheck } from 'lucide-react'
import CycleIndicator from '../components/CycleIndicator'
import LineSelector from '../components/LineSelector'
import MachineCard from '../components/MachineCard'
import LoginModal from '../components/LoginModal'
import { getCurrentCycle, getLines, getChecklist, getRecords, createRecord, completeTask, uploadPhoto, saveMaintenanceRecord, login as apiLogin } from '../api'

export default function Dashboard({ user, onLoginRequired, setUser }) {
  const [cycle, setCycle] = useState(null)
  const [lines, setLines] = useState([])
  const [records, setRecords] = useState([])
  const [selectedLine, setSelectedLine] = useState(null)
  const [checklist, setChecklist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [starting, setStarting] = useState(false)

  // Local task state for batch save
  const [localCompletions, setLocalCompletions] = useState({}) // { taskId: { completed, notes } }
  const [showSaveLogin, setShowSaveLogin] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadInitialData() }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [cycleRes, linesRes, recordsRes] = await Promise.all([getCurrentCycle(), getLines(), getRecords()])
      setCycle(cycleRes.data); setLines(linesRes.data); setRecords(recordsRes.data)
    } catch (err) { console.error('Error loading data:', err) }
    finally { setLoading(false) }
  }

  const loadChecklist = useCallback(async (lineId) => {
    setChecklistLoading(true)
    try {
      const res = await getChecklist(lineId)
      setChecklist(res.data)
      // Initialize local completions from existing data
      const comps = {}
      res.data.machines?.forEach(m => {
        m.tasks?.forEach(t => {
          if (t.completion) {
            comps[t.id] = { completed: t.completion.completed, notes: t.completion.notes || '' }
          }
        })
      })
      setLocalCompletions(comps)
    } catch (err) { console.error('Error loading checklist:', err) }
    finally { setChecklistLoading(false) }
  }, [])

  const handleSelectLine = (line) => { setSelectedLine(line); loadChecklist(line.id) }
  const handleBack = () => { setSelectedLine(null); setChecklist(null); setLocalCompletions({}); setSaveError(null); loadInitialData() }

  const handleStartMaintenance = async () => {
    if (!user) { onLoginRequired(); return }
    setStarting(true)
    try {
      await createRecord(selectedLine.id)
      await loadChecklist(selectedLine.id)
    } catch (err) { console.error('Error starting:', err) }
    finally { setStarting(false) }
  }

  // Toggle task completion locally (no API call yet)
  const handleToggleTask = (taskId, completed) => {
    setLocalCompletions(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], completed, notes: prev[taskId]?.notes || '' }
    }))
  }

  // Update task notes locally
  const handleUpdateNotes = (taskId, notes) => {
    setLocalCompletions(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], completed: prev[taskId]?.completed || false, notes }
    }))
  }

  // Upload photo (still immediate since it needs the file)
  const handleUploadPhoto = async (taskId, photoType, file) => {
    if (!user) { onLoginRequired(); return }
    if (!checklist?.record) { await handleStartMaintenance() }
    const recordId = checklist?.record?.id
    if (!recordId) return
    await uploadPhoto(recordId, taskId, photoType, file)
    await loadChecklist(selectedLine.id)
  }

  // Validate before save
  const validateCompletions = () => {
    const allTasks = checklist?.machines?.flatMap(m => m.tasks) || []
    const errors = []

    for (const task of allTasks) {
      const comp = localCompletions[task.id]
      if (!comp || !comp.completed) {
        // Not completed — needs notes
        if (!comp?.notes?.trim()) {
          errors.push({ taskId: task.id, message: `"${task.description}" no está completada y requiere un comentario.` })
        }
      }
      // Check photos — all tasks require before/after
      const hasBeforePhoto = task.photos?.some(p => p.photo_type === 'before')
      const hasAfterPhoto = task.photos?.some(p => p.photo_type === 'after')
      if (comp?.completed && (!hasBeforePhoto || !hasAfterPhoto)) {
        errors.push({ taskId: task.id, message: `"${task.description}" requiere fotos de antes y después.` })
      }
      if (!comp?.completed && !hasBeforePhoto) {
        errors.push({ taskId: task.id, message: `"${task.description}" requiere al menos una foto mostrando el problema.` })
      }
    }
    return errors
  }

  // Click "Guardar" → validate → show login for credentials
  const handleSaveClick = () => {
    setSaveError(null)
    const errors = validateCompletions()
    if (errors.length > 0) {
      setSaveError(errors[0].message)
      return
    }
    setShowSaveLogin(true)
  }

  // After credential confirmation → batch save
  const handleSaveConfirm = async ({ employee_input, password }) => {
    setSaving(true)
    try {
      // Authenticate
      const authRes = await apiLogin(employee_input, password)
      if (!authRes.success) throw new Error(authRes.message || 'Error de autenticación')

      // Set token for this save
      localStorage.setItem('token', authRes.token)
      localStorage.setItem('user', JSON.stringify(authRes.user))
      if (setUser) setUser(authRes.user)

      // Build completions array
      const allTasks = checklist?.machines?.flatMap(m => m.tasks) || []
      const completions = allTasks.map(task => ({
        task_id: task.id,
        completed: localCompletions[task.id]?.completed || false,
        notes: localCompletions[task.id]?.notes || null,
      }))

      const recordId = checklist?.record?.id
      await saveMaintenanceRecord(recordId, completions)
      setShowSaveLogin(false)
      setSaveError(null)
      await loadChecklist(selectedLine.id)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error guardando'
      throw new Error(msg)
    } finally {
      setSaving(false)
    }
  }

  const hasRecord = !!checklist?.record
  const allTasks = checklist?.machines?.flatMap(m => m.tasks) || []
  const totalTasks = allTasks.length
  const addressedTasks = allTasks.filter(t => localCompletions[t.id]?.completed || localCompletions[t.id]?.notes?.trim()).length
  const isRecordCompleted = checklist?.record?.status === 'completed'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <CycleIndicator cycle={cycle} loading={loading} />

      {!selectedLine ? (<>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Líneas de Producción</h2>
        </div>
        <LineSelector lines={lines} records={records.filter(r => r.week_number === cycle?.weekNumber && r.year == cycle?.year)} onSelect={handleSelectLine} loading={loading} />
      </>) : (<>
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />Volver
          </button>
          <h2 className="text-lg font-bold text-white">{selectedLine.name}</h2>
          <div className="w-20" />
        </div>

        {!hasRecord && !checklistLoading && (
          <div className="glass-card rounded-xl p-6 border border-neutral-800/50 text-center">
            <p className="text-neutral-400 mb-4">
              {user ? 'No se ha iniciado el mantenimiento para esta línea esta semana.' : 'Inicie sesión para comenzar.'}
            </p>
            <button onClick={user ? handleStartMaintenance : onLoginRequired} disabled={starting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 disabled:opacity-50">
              {starting ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Iniciando...</>
                : <><Play className="w-4 h-4" />{user ? 'Iniciar Mantenimiento' : 'Iniciar Sesión'}</>}
            </button>
          </div>
        )}

        {hasRecord && (
          <div className="glass-card rounded-xl p-3 px-4 border border-neutral-800/50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isRecordCompleted ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-sm text-neutral-300">
                {isRecordCompleted ? 'Mantenimiento completado por' : 'Sesión iniciada por'} <span className="text-white font-medium">{checklist.record.operator_name}</span>
              </span>
            </div>
            <span className="text-xs text-neutral-500">{new Date(checklist.record.started_at).toLocaleString('es-MX')}</span>
          </div>
        )}

        {checklistLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-xl p-5 border border-neutral-800/50 animate-pulse">
                <div className="h-5 bg-neutral-800 rounded w-40 mb-3"></div>
                <div className="h-3 bg-neutral-800 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : (<>
          <div className="space-y-4">
            {checklist?.machines?.map(machine => (
              <MachineCard key={machine.id} machine={machine} recordId={checklist?.record?.id}
                localCompletions={localCompletions}
                onToggle={handleToggleTask} onUpdateNotes={handleUpdateNotes}
                onUploadPhoto={handleUploadPhoto} disabled={!hasRecord || isRecordCompleted} />
            ))}
            {checklist?.machines?.length === 0 && (
              <div className="glass-card rounded-xl p-8 border border-neutral-800/50 text-center">
                <p className="text-neutral-500">No hay máquinas configuradas para esta línea.</p>
              </div>
            )}
          </div>

          {/* Save button */}
          {hasRecord && !isRecordCompleted && totalTasks > 0 && (
            <div className="glass-card rounded-xl p-4 border border-neutral-800/50 space-y-3">
              {saveError && (
                <div className="flex items-start gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg">
                  <span>⚠️</span><span>{saveError}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">{addressedTasks} / {totalTasks} tareas registradas</span>
                <button onClick={handleSaveClick}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-all shadow-lg">
                  <ShieldCheck className="w-5 h-5" />
                  Guardar Mantenimiento
                </button>
              </div>
            </div>
          )}
        </>)}

        {/* Save login modal */}
        <LoginModal visible={showSaveLogin} onClose={() => setShowSaveLogin(false)} onConfirm={handleSaveConfirm} busy={saving} />
      </>)}
    </div>
  )
}
