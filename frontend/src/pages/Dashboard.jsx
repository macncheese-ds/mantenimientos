import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Play } from 'lucide-react'
import CycleIndicator from '../components/CycleIndicator'
import LineSelector from '../components/LineSelector'
import MachineCard from '../components/MachineCard'
import { getCurrentCycle, getLines, getChecklist, getRecords, createRecord, completeTask, uploadPhoto } from '../api'

export default function Dashboard({ user, onLoginRequired }) {
  const [cycle, setCycle] = useState(null)
  const [lines, setLines] = useState([])
  const [records, setRecords] = useState([])
  const [selectedLine, setSelectedLine] = useState(null)
  const [checklist, setChecklist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [starting, setStarting] = useState(false)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [cycleRes, linesRes, recordsRes] = await Promise.all([
        getCurrentCycle(),
        getLines(),
        getRecords(),
      ])
      setCycle(cycleRes.data)
      setLines(linesRes.data)
      setRecords(recordsRes.data)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load checklist for selected line
  const loadChecklist = useCallback(async (lineId) => {
    setChecklistLoading(true)
    try {
      const res = await getChecklist(lineId)
      setChecklist(res.data)
    } catch (err) {
      console.error('Error loading checklist:', err)
    } finally {
      setChecklistLoading(false)
    }
  }, [])

  const handleSelectLine = (line) => {
    setSelectedLine(line)
    loadChecklist(line.id)
  }

  const handleBack = () => {
    setSelectedLine(null)
    setChecklist(null)
    loadInitialData() // Refresh records
  }

  // Start maintenance session (creates or gets existing record)
  const handleStartMaintenance = async () => {
    if (!user) {
      onLoginRequired()
      return
    }
    setStarting(true)
    try {
      const res = await createRecord(selectedLine.id)
      // Reload checklist to get the record
      await loadChecklist(selectedLine.id)
    } catch (err) {
      console.error('Error starting maintenance:', err)
    } finally {
      setStarting(false)
    }
  }

  // Complete a task
  const handleCompleteTask = async (taskId, completed) => {
    if (!user) {
      onLoginRequired()
      return
    }
    if (!checklist?.record) {
      // Auto-start if no record yet
      await handleStartMaintenance()
    }
    const recordId = checklist?.record?.id
    if (!recordId) return

    await completeTask(recordId, taskId, completed)
    // Refresh checklist to get updated state
    await loadChecklist(selectedLine.id)
  }

  // Upload photo
  const handleUploadPhoto = async (taskId, photoType, file) => {
    if (!user) {
      onLoginRequired()
      return
    }
    if (!checklist?.record) {
      await handleStartMaintenance()
    }
    const recordId = checklist?.record?.id
    if (!recordId) return

    await uploadPhoto(recordId, taskId, photoType, file)
    await loadChecklist(selectedLine.id)
  }

  const hasRecord = !!checklist?.record
  const isDisabled = !user || !hasRecord

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Cycle Indicator */}
      <CycleIndicator cycle={cycle} loading={loading} />

      {/* Line selection or checklist */}
      {!selectedLine ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Líneas de Producción</h2>
          </div>
          <LineSelector
            lines={lines}
            records={records.filter(r => r.week_number === cycle?.weekNumber && r.year == cycle?.year)}
            onSelect={handleSelectLine}
            loading={loading}
          />
        </>
      ) : (
        <>
          {/* Back button + line name */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <h2 className="text-lg font-bold text-white">{selectedLine.name}</h2>
            <div className="w-20" /> {/* Spacer */}
          </div>

          {/* Start maintenance button if no record */}
          {!hasRecord && !checklistLoading && (
            <div className="glass-card rounded-xl p-6 border border-neutral-800/50 text-center">
              <p className="text-neutral-400 mb-4">
                {user
                  ? 'No se ha iniciado el mantenimiento para esta línea esta semana.'
                  : 'Inicie sesión para comenzar el mantenimiento.'}
              </p>
              <button
                onClick={user ? handleStartMaintenance : onLoginRequired}
                disabled={starting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-all disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {user ? 'Iniciar Mantenimiento' : 'Iniciar Sesión'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Record info */}
          {hasRecord && (
            <div className="glass-card rounded-xl p-3 px-4 border border-neutral-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${checklist.record.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <span className="text-sm text-neutral-300">
                  Sesión iniciada por <span className="text-white font-medium">{checklist.record.operator_name}</span>
                </span>
              </div>
              <span className="text-xs text-neutral-500">
                {new Date(checklist.record.started_at).toLocaleString('es-MX')}
              </span>
            </div>
          )}

          {/* Machine checklist */}
          {checklistLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card rounded-xl p-5 border border-neutral-800/50 animate-pulse">
                  <div className="h-5 bg-neutral-800 rounded w-40 mb-3"></div>
                  <div className="h-3 bg-neutral-800 rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {checklist?.machines?.map(machine => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  recordId={checklist?.record?.id}
                  onComplete={handleCompleteTask}
                  onUploadPhoto={handleUploadPhoto}
                  disabled={isDisabled}
                />
              ))}
              {checklist?.machines?.length === 0 && (
                <div className="glass-card rounded-xl p-8 border border-neutral-800/50 text-center">
                  <p className="text-neutral-500">No hay máquinas configuradas para esta línea.</p>
                  <p className="text-xs text-neutral-600 mt-1">Ve a Configuración para agregar máquinas y tareas.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
