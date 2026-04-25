import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Factory, Cpu, ClipboardList, Settings2, ChevronDown, ChevronRight } from 'lucide-react'
import { getLines, createLine, updateLine, deleteLine, getMachines, createMachine, updateMachine, deleteMachine, getTasks, createTask, updateTask, deleteTask, getConfig, updateConfig } from '../api'
import { frequencyLabels, frequencyColors } from '../components/CycleIndicator'

export default function Config({ user }) {
  const [tab, setTab] = useState('lines')
  const [lines, setLines] = useState([])
  const [machines, setMachines] = useState([])
  const [tasks, setTasks] = useState([])
  const [config, setConfigData] = useState([])
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Filters
  const [selectedLineFilter, setSelectedLineFilter] = useState('')
  const [selectedMachineFilter, setSelectedMachineFilter] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [linesRes, machinesRes, tasksRes, configRes] = await Promise.all([
        getLines(),
        getMachines(),
        getTasks(),
        getConfig(),
      ])
      setLines(linesRes.data)
      setMachines(machinesRes.data)
      setTasks(tasksRes.data)
      setConfigData(configRes.data)
    } catch (err) {
      console.error('Error loading config:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.rol !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="glass-card rounded-xl p-8 border border-neutral-800/50 text-center">
          <Settings2 className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">Se requieren permisos de administrador para acceder a la configuración.</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'lines', label: 'Líneas', icon: Factory },
    { key: 'machines', label: 'Máquinas', icon: Cpu },
    { key: 'tasks', label: 'Tareas', icon: ClipboardList },
    { key: 'settings', label: 'Ajustes', icon: Settings2 },
  ]

  // ── Handlers ──
  const handleSaveLine = async () => {
    setSaving(true)
    try {
      if (showAdd) {
        await createLine(addForm)
        setShowAdd(false)
        setAddForm({})
      } else {
        await updateLine(editingId, editForm)
        setEditingId(null)
      }
      await loadAll()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDeleteLine = async (id) => {
    if (!confirm('¿Eliminar esta línea?')) return
    await deleteLine(id)
    await loadAll()
  }

  const handleSaveMachine = async () => {
    setSaving(true)
    try {
      if (showAdd) {
        await createMachine(addForm)
        setShowAdd(false)
        setAddForm({})
      } else {
        await updateMachine(editingId, editForm)
        setEditingId(null)
      }
      await loadAll()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDeleteMachine = async (id) => {
    if (!confirm('¿Eliminar esta máquina?')) return
    await deleteMachine(id)
    await loadAll()
  }

  const handleSaveTask = async () => {
    setSaving(true)
    try {
      if (showAdd) {
        await createTask(addForm)
        setShowAdd(false)
        setAddForm({})
      } else {
        await updateTask(editingId, editForm)
        setEditingId(null)
      }
      await loadAll()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDeleteTask = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await deleteTask(id)
    await loadAll()
  }

  const handleSaveConfig = async (key, value) => {
    await updateConfig(key, value)
    await loadAll()
  }

  // ── Filtered data ──
  const filteredMachines = selectedLineFilter
    ? machines.filter(m => m.line_id == selectedLineFilter)
    : machines

  const filteredTasks = selectedMachineFilter
    ? tasks.filter(t => t.machine_id == selectedMachineFilter)
    : selectedLineFilter
    ? tasks.filter(t => t.line_id == selectedLineFilter)
    : tasks

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h2 className="text-lg font-bold text-white">Configuración</h2>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-neutral-900/50 rounded-lg p-1 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setShowAdd(false); setEditingId(null) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === key ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-8 border border-neutral-800/50 text-center">
          <div className="w-6 h-6 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {/* ── Lines Tab ── */}
          {tab === 'lines' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => { setShowAdd(true); setAddForm({ name: '', display_order: lines.length + 1 }) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-all">
                  <Plus className="w-4 h-4" /> Agregar Línea
                </button>
              </div>

              {showAdd && (
                <div className="glass-card rounded-xl p-4 border border-blue-500/30 space-y-3">
                  <input type="text" placeholder="Nombre de la línea" value={addForm.name || ''} onChange={e => setAddForm({...addForm, name: e.target.value})} className="w-full bg-neutral-900/50 border border-neutral-700/50 text-white px-4 py-2 rounded-lg text-sm" />
                  <div className="flex gap-2">
                    <button onClick={handleSaveLine} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-all disabled:opacity-50"><Save className="w-4 h-4 inline mr-1" />Guardar</button>
                    <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-sm hover:bg-neutral-700 transition-all"><X className="w-4 h-4 inline mr-1" />Cancelar</button>
                  </div>
                </div>
              )}

              {lines.map(line => (
                <div key={line.id} className="glass-card rounded-xl p-4 border border-neutral-800/50 flex items-center justify-between">
                  {editingId === line.id ? (
                    <div className="flex-1 flex items-center gap-3">
                      <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-neutral-900/50 border border-neutral-700/50 text-white px-3 py-1.5 rounded-lg text-sm flex-1" />
                      <button onClick={handleSaveLine} disabled={saving} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Factory className="w-5 h-5 text-neutral-500" />
                        <span className="text-sm font-medium text-white">{line.name}</span>
                        <span className="text-xs text-neutral-600">#{line.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingId(line.id); setEditForm({ name: line.name }) }} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteLine(line.id)} className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Machines Tab ── */}
          {tab === 'machines' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <select value={selectedLineFilter} onChange={e => setSelectedLineFilter(e.target.value)} className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 text-sm px-3 py-2 rounded-lg">
                  <option value="">Todas las líneas</option>
                  {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button onClick={() => { setShowAdd(true); setAddForm({ name: '', line_id: selectedLineFilter || lines[0]?.id, display_order: 0 }) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-all">
                  <Plus className="w-4 h-4" /> Agregar Máquina
                </button>
              </div>

              {showAdd && (
                <div className="glass-card rounded-xl p-4 border border-blue-500/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="Nombre de la máquina" value={addForm.name || ''} onChange={e => setAddForm({...addForm, name: e.target.value})} className="bg-neutral-900/50 border border-neutral-700/50 text-white px-4 py-2 rounded-lg text-sm" />
                    <select value={addForm.line_id || ''} onChange={e => setAddForm({...addForm, line_id: e.target.value})} className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 px-4 py-2 rounded-lg text-sm">
                      {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveMachine} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-all disabled:opacity-50"><Save className="w-4 h-4 inline mr-1" />Guardar</button>
                    <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-sm hover:bg-neutral-700 transition-all"><X className="w-4 h-4 inline mr-1" />Cancelar</button>
                  </div>
                </div>
              )}

              {filteredMachines.map(machine => (
                <div key={machine.id} className="glass-card rounded-xl p-4 border border-neutral-800/50 flex items-center justify-between">
                  {editingId === machine.id ? (
                    <div className="flex-1 flex items-center gap-3 flex-wrap">
                      <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-neutral-900/50 border border-neutral-700/50 text-white px-3 py-1.5 rounded-lg text-sm flex-1" />
                      <select value={editForm.line_id || ''} onChange={e => setEditForm({...editForm, line_id: e.target.value})} className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 px-3 py-1.5 rounded-lg text-sm">
                        {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                      <button onClick={handleSaveMachine} disabled={saving} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Cpu className="w-5 h-5 text-neutral-500" />
                        <div>
                          <span className="text-sm font-medium text-white">{machine.name}</span>
                          <span className="text-xs text-neutral-500 ml-2">{machine.line_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingId(machine.id); setEditForm({ name: machine.name, line_id: machine.line_id }) }} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteMachine(machine.id)} className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {filteredMachines.length === 0 && (
                <div className="text-center text-sm text-neutral-500 py-6">No hay máquinas. Agrega una para comenzar.</div>
              )}
            </div>
          )}

          {/* ── Tasks Tab ── */}
          {tab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                  <select value={selectedLineFilter} onChange={e => { setSelectedLineFilter(e.target.value); setSelectedMachineFilter('') }} className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 text-sm px-3 py-2 rounded-lg">
                    <option value="">Todas las líneas</option>
                    {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <select value={selectedMachineFilter} onChange={e => setSelectedMachineFilter(e.target.value)} className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 text-sm px-3 py-2 rounded-lg">
                    <option value="">Todas las máquinas</option>
                    {(selectedLineFilter ? machines.filter(m => m.line_id == selectedLineFilter) : machines).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => { setShowAdd(true); setAddForm({ description: '', machine_id: selectedMachineFilter || machines[0]?.id, frequency: 'weekly', requires_photo: false }) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-all">
                  <Plus className="w-4 h-4" /> Agregar Tarea
                </button>
              </div>

              {showAdd && (
                <div className="glass-card rounded-xl p-4 border border-blue-500/30 space-y-3">
                  <textarea placeholder="Descripción de la tarea" value={addForm.description || ''} onChange={e => setAddForm({...addForm, description: e.target.value})} className="w-full bg-neutral-900/50 border border-neutral-700/50 text-white px-4 py-2 rounded-lg text-sm resize-none h-20" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select value={addForm.machine_id || ''} onChange={e => setAddForm({...addForm, machine_id: e.target.value})} className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 px-4 py-2 rounded-lg text-sm">
                      {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({lines.find(l => l.id === m.line_id)?.name})</option>)}
                    </select>
                    <select value={addForm.frequency || 'weekly'} onChange={e => setAddForm({...addForm, frequency: e.target.value})} className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 px-4 py-2 rounded-lg text-sm">
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual (cada 4 semanas)</option>
                      <option value="semiannual">Semestral (cada 26 semanas)</option>
                      <option value="annual">Anual (semana 52)</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                      <input type="checkbox" checked={addForm.requires_photo || false} onChange={e => setAddForm({...addForm, requires_photo: e.target.checked})} className="rounded" />
                      Requiere foto
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveTask} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-all disabled:opacity-50"><Save className="w-4 h-4 inline mr-1" />Guardar</button>
                    <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-sm hover:bg-neutral-700 transition-all"><X className="w-4 h-4 inline mr-1" />Cancelar</button>
                  </div>
                </div>
              )}

              {filteredTasks.map(task => (
                <div key={task.id} className="glass-card rounded-xl p-4 border border-neutral-800/50 flex items-center justify-between gap-3">
                  {editingId === task.id ? (
                    <div className="flex-1 space-y-2">
                      <textarea value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-neutral-900/50 border border-neutral-700/50 text-white px-3 py-1.5 rounded-lg text-sm resize-none h-16" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <select value={editForm.frequency || ''} onChange={e => setEditForm({...editForm, frequency: e.target.value})} className="bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 px-3 py-1.5 rounded-lg text-sm">
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensual</option>
                          <option value="semiannual">Semestral</option>
                          <option value="annual">Anual</option>
                        </select>
                        <button onClick={handleSaveTask} disabled={saving} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200">{task.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-neutral-500">{task.machine_name}</span>
                          <span className={`badge ${frequencyColors[task.frequency]} text-[10px]`}>{frequencyLabels[task.frequency]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingId(task.id); setEditForm({ description: task.description, frequency: task.frequency }) }} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {filteredTasks.length === 0 && (
                <div className="text-center text-sm text-neutral-500 py-6">No hay tareas. Agrega una para comenzar.</div>
              )}
            </div>
          )}

          {/* ── Settings Tab ── */}
          {tab === 'settings' && (
            <div className="space-y-4">
              {config.map(c => (
                <div key={c.id} className="glass-card rounded-xl p-4 border border-neutral-800/50">
                  <label className="block text-sm text-neutral-400 mb-2">{c.description || c.config_key}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type={c.config_key.includes('date') ? 'date' : 'text'}
                      defaultValue={c.config_value}
                      onBlur={(e) => {
                        if (e.target.value !== c.config_value) {
                          handleSaveConfig(c.config_key, e.target.value)
                        }
                      }}
                      className="bg-neutral-900/50 border border-neutral-700/50 text-white px-4 py-2 rounded-lg text-sm flex-1 max-w-xs"
                    />
                    <span className="text-xs text-neutral-600 font-mono">{c.config_key}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
