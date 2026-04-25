import React, { useState, useEffect } from 'react'
import { Search, Filter, ChevronDown, ChevronUp, CheckCircle2, Clock, Calendar, User, Image } from 'lucide-react'
import { getRecords, getRecordDetail, getLines } from '../api'
import { frequencyLabels, frequencyColors } from '../components/CycleIndicator'
import { API_BASE_URL } from '../api'

export default function History() {
  const [records, setRecords] = useState([])
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)

  // Filters
  const [filterLine, setFilterLine] = useState('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [filterLine, filterYear, filterStatus])

  const loadData = async () => {
    setLoading(true)
    try {
      const [linesRes, recordsRes] = await Promise.all([
        getLines(),
        getRecords({
          ...(filterLine && { line_id: filterLine }),
          ...(filterYear && { year: filterYear }),
          ...(filterStatus && { status: filterStatus }),
        }),
      ])
      setLines(linesRes.data)
      setRecords(recordsRes.data)
    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null)
      setDetail(null)
      return
    }
    setExpandedId(id)
    setDetailLoading(true)
    try {
      const res = await getRecordDetail(id)
      setDetail(res.data)
    } catch (err) {
      console.error('Error loading detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  // Group completions by machine
  const groupByMachine = (completions) => {
    const groups = {}
    for (const c of completions) {
      const key = c.machine_id || 'unknown'
      if (!groups[key]) {
        groups[key] = { name: c.machine_name, tasks: [] }
      }
      groups[key].tasks.push(c)
    }
    return Object.values(groups)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h2 className="text-lg font-bold text-white">Historial de Mantenimiento</h2>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 border border-neutral-800/50">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-neutral-500" />

          <select
            value={filterLine}
            onChange={(e) => setFilterLine(e.target.value)}
            className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 text-sm px-3 py-2 rounded-lg"
          >
            <option value="">Todas las líneas</option>
            {lines.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 text-sm px-3 py-2 rounded-lg"
          >
            <option value="">Todos los años</option>
            {[2026, 2025].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 text-sm px-3 py-2 rounded-lg"
          >
            <option value="">Todos los estados</option>
            <option value="completed">Completado</option>
            <option value="in_progress">En progreso</option>
          </select>
        </div>
      </div>

      {/* Records list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card rounded-xl p-4 border border-neutral-800/50 animate-pulse">
              <div className="h-5 bg-neutral-800 rounded w-48 mb-2"></div>
              <div className="h-4 bg-neutral-800 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="glass-card rounded-xl p-8 border border-neutral-800/50 text-center">
          <Calendar className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">No hay registros de mantenimiento</p>
          <p className="text-xs text-neutral-600 mt-1">Los registros aparecerán aquí cuando se completen sesiones de mantenimiento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(record => (
            <div key={record.id} className="glass-card rounded-xl border border-neutral-800/50 overflow-hidden">
              {/* Record header */}
              <button
                onClick={() => handleExpand(record.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-900/30 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  {record.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{record.line_name}</span>
                      <span className="text-xs text-neutral-500">Semana {record.week_number}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <User className="w-3 h-3 text-neutral-600" />
                      <span className="text-xs text-neutral-500">{record.operator_name} ({record.operator_num_empleado})</span>
                      <span className="text-xs text-neutral-600">·</span>
                      <span className="text-xs text-neutral-500">{record.completed_tasks || 0} tareas</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500 hidden sm:block">
                    {new Date(record.started_at).toLocaleDateString('es-MX')}
                  </span>
                  {expandedId === record.id ? (
                    <ChevronUp className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === record.id && (
                <div className="border-t border-neutral-800/30 p-4">
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
                    </div>
                  ) : detail ? (
                    <div className="space-y-4">
                      {/* Meta */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-neutral-500">Inicio</span>
                          <p className="text-neutral-300 font-medium">{new Date(detail.started_at).toLocaleString('es-MX')}</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Fin</span>
                          <p className="text-neutral-300 font-medium">{detail.completed_at ? new Date(detail.completed_at).toLocaleString('es-MX') : '—'}</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Operador</span>
                          <p className="text-neutral-300 font-medium">{detail.operator_name}</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Estado</span>
                          <p className={`font-medium ${detail.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {detail.status === 'completed' ? 'Completado' : 'En progreso'}
                          </p>
                        </div>
                      </div>

                      {/* Tasks by machine */}
                      {detail.completions && detail.completions.length > 0 ? (
                        <div className="space-y-3">
                          {groupByMachine(detail.completions).map((group, idx) => (
                            <div key={idx} className="bg-neutral-900/30 rounded-lg p-3">
                              <h4 className="text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">{group.name}</h4>
                              <div className="space-y-1.5">
                                {group.tasks.map(task => (
                                  <div key={task.id} className="flex items-center gap-2">
                                    {task.completed ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-neutral-600 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm flex-1 ${task.completed ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                      {task.task_description}
                                    </span>
                                    <span className={`badge ${frequencyColors[task.frequency]} text-[10px]`}>
                                      {frequencyLabels[task.frequency]}
                                    </span>
                                    {/* Photo thumbnails */}
                                    {task.photos && task.photos.length > 0 && (
                                      <div className="flex gap-1">
                                        {task.photos.map(photo => (
                                          <img
                                            key={photo.id}
                                            src={`${API_BASE_URL}${photo.file_path}`}
                                            alt={photo.photo_type}
                                            className="w-8 h-8 object-cover rounded cursor-pointer border border-neutral-700 hover:border-neutral-500 transition-all"
                                            onClick={() => setLightboxUrl(`${API_BASE_URL}${photo.file_path}`)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500 text-center py-4">No hay tareas registradas</p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4 animate-fade-in cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Foto"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
