import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, Save, X, Factory, Cpu, ClipboardList, Settings2, Hash } from 'lucide-react'
import { getLines, createLine, updateLine, deleteLine, getMachines, createMachine, createMachinesBulk, updateMachine, deleteMachine, getTasks, createTask, createTasksBulk, updateTask, deleteTask, getConfig, updateConfig } from '../api'
import { frequencyLabels, frequencyColors } from '../components/CycleIndicator'

export default function Config({ user }) {
  const [tab, setTab] = useState('lines')
  const [lines, setLines] = useState([])
  const [machines, setMachines] = useState([])
  const [tasks, setTasks] = useState([])
  const [config, setConfigData] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [selectedLineFilter, setSelectedLineFilter] = useState('')
  const [selectedMachineFilter, setSelectedMachineFilter] = useState('')

  // Bulk add state
  const [showBulkMachines, setShowBulkMachines] = useState(false)
  const [bulkMachines, setBulkMachines] = useState([{ name: '', serial_number: '' }])
  const [bulkMachineLine, setBulkMachineLine] = useState('')

  const [showBulkTasks, setShowBulkTasks] = useState(false)
  const [bulkTasks, setBulkTasks] = useState([{ description: '', frequency: 'weekly' }])
  const [bulkTaskMachine, setBulkTaskMachine] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [a, b, c, d] = await Promise.all([getLines(), getMachines(), getTasks(), getConfig()])
      setLines(a.data); setMachines(b.data); setTasks(c.data); setConfigData(d.data)
    } catch (err) { console.error('Error loading config:', err) }
    finally { setLoading(false) }
  }

  if (!user || user.rol !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="glass-card rounded-xl p-8 border border-neutral-800/50 text-center">
          <Settings2 className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">Se requieren permisos de administrador.</p>
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

  // ── Machine bulk handlers ──
  const handleBulkMachineKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setBulkMachines(prev => [...prev, { name: '', serial_number: '' }])
      setTimeout(() => {
        const inputs = document.querySelectorAll('[data-bulk-machine-name]')
        inputs[inputs.length - 1]?.focus()
      }, 50)
    }
  }

  const updateBulkMachine = (idx, field, value) => {
    setBulkMachines(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  const removeBulkMachine = (idx) => {
    if (bulkMachines.length <= 1) return
    setBulkMachines(prev => prev.filter((_, i) => i !== idx))
  }

  const saveBulkMachines = async () => {
    const valid = bulkMachines.filter(m => m.name.trim())
    if (!valid.length || !bulkMachineLine) return
    setSaving(true)
    try {
      await createMachinesBulk(bulkMachineLine, valid)
      setShowBulkMachines(false)
      setBulkMachines([{ name: '', serial_number: '' }])
      await loadAll()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  // ── Task bulk handlers ──
  const handleBulkTaskKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const currentFreq = bulkTasks[idx]?.frequency || 'weekly'
      setBulkTasks(prev => [...prev, { description: '', frequency: currentFreq }])
      setTimeout(() => {
        const inputs = document.querySelectorAll('[data-bulk-task-desc]')
        inputs[inputs.length - 1]?.focus()
      }, 50)
    }
  }

  const updateBulkTask = (idx, field, value) => {
    setBulkTasks(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  const removeBulkTask = (idx) => {
    if (bulkTasks.length <= 1) return
    setBulkTasks(prev => prev.filter((_, i) => i !== idx))
  }

  const saveBulkTasks = async () => {
    const valid = bulkTasks.filter(t => t.description.trim() && t.frequency)
    if (!valid.length || !bulkTaskMachine) return
    setSaving(true)
    try {
      await createTasksBulk(bulkTaskMachine, valid)
      setShowBulkTasks(false)
      setBulkTasks([{ description: '', frequency: 'weekly' }])
      await loadAll()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  // ── Single edit handlers ──
  const handleSaveLine = async (form, isNew) => {
    setSaving(true)
    try {
      if (isNew) await createLine(form)
      else await updateLine(editingId, form)
      setEditingId(null)
      await loadAll()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleSaveMachine = async () => {
    setSaving(true)
    try {
      await updateMachine(editingId, editForm)
      setEditingId(null)
      await loadAll()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleSaveTask = async () => {
    setSaving(true)
    try {
      await updateTask(editingId, editForm)
      setEditingId(null)
      await loadAll()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleSaveConfig = async (key, value) => { await updateConfig(key, value); await loadAll() }

  const filteredMachines = selectedLineFilter ? machines.filter(m => m.line_id == selectedLineFilter) : machines
  const filteredTasks = selectedMachineFilter ? tasks.filter(t => t.machine_id == selectedMachineFilter)
    : selectedLineFilter ? tasks.filter(t => t.line_id == selectedLineFilter) : tasks

  const inputCls = "bg-neutral-900/50 border border-neutral-700/50 text-white px-3 py-2 rounded-lg text-sm w-full"
  const selectCls = "bg-neutral-900/50 border border-neutral-700/50 text-neutral-200 text-sm px-3 py-2 rounded-lg"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h2 className="text-lg font-bold text-white">Configuración</h2>

      <div className="flex items-center gap-1 bg-neutral-900/50 rounded-lg p-1 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setEditingId(null); setShowBulkMachines(false); setShowBulkTasks(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === key ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-8 border border-neutral-800/50 text-center">
          <div className="w-6 h-6 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : (<>
        {/* ── LINES ── */}
        {tab === 'lines' && (
          <div className="space-y-3">
            {editingId === 'new-line' ? (
              <div className="glass-card rounded-xl p-4 border border-blue-500/30 space-y-3">
                <input type="text" placeholder="Nombre de la línea" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveLine(editForm, true) }} />
                <div className="flex gap-2">
                  <button onClick={() => handleSaveLine(editForm, true)} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 disabled:opacity-50"><Save className="w-4 h-4 inline mr-1" />Guardar</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-sm"><X className="w-4 h-4 inline mr-1" />Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <button onClick={() => { setEditingId('new-line'); setEditForm({ name: '', display_order: lines.length + 1 }) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200">
                  <Plus className="w-4 h-4" /> Agregar Línea
                </button>
              </div>
            )}
            {lines.map(line => (
              <div key={line.id} className="glass-card rounded-xl p-4 border border-neutral-800/50 flex items-center justify-between">
                {editingId === line.id ? (
                  <div className="flex-1 flex items-center gap-3">
                    <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls + ' flex-1'} />
                    <button onClick={() => handleSaveLine(editForm, false)} disabled={saving} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (<>
                  <div className="flex items-center gap-3">
                    <Factory className="w-5 h-5 text-neutral-500" />
                    <span className="text-sm font-medium text-white">{line.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingId(line.id); setEditForm({ name: line.name }) }} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => { if (confirm('¿Eliminar?')) { await deleteLine(line.id); await loadAll() } }} className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </>)}
              </div>
            ))}
          </div>
        )}

        {/* ── MACHINES (bulk add) ── */}
        {tab === 'machines' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <select value={selectedLineFilter} onChange={e => setSelectedLineFilter(e.target.value)} className={selectCls}>
                <option value="">Todas las líneas</option>
                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button onClick={() => { setShowBulkMachines(true); setBulkMachineLine(selectedLineFilter || (lines[0]?.id || '')); setBulkMachines([{ name: '', serial_number: '' }]) }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200">
                <Plus className="w-4 h-4" /> Agregar Máquinas
              </button>
            </div>

            {showBulkMachines && (
              <div className="glass-card rounded-xl p-5 border border-blue-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Registro de Máquinas</h3>
                  <span className="text-xs text-neutral-500">Presiona Enter para agregar otra fila</span>
                </div>
                <select value={bulkMachineLine} onChange={e => setBulkMachineLine(e.target.value)} className={selectCls + ' w-full'}>
                  <option value="">Seleccionar línea</option>
                  {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-xs text-neutral-500 px-1">
                    <span>Nombre</span><span>No. Serie</span><span></span>
                  </div>
                  {bulkMachines.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_40px] gap-2 animate-fade-in">
                      <input data-bulk-machine-name type="text" placeholder={`Máquina ${idx + 1}`} value={m.name}
                        onChange={e => updateBulkMachine(idx, 'name', e.target.value)} onKeyDown={e => handleBulkMachineKeyDown(e, idx)} className={inputCls} autoFocus={idx === bulkMachines.length - 1} />
                      <input type="text" placeholder="Serial" value={m.serial_number}
                        onChange={e => updateBulkMachine(idx, 'serial_number', e.target.value)} onKeyDown={e => handleBulkMachineKeyDown(e, idx)} className={inputCls} />
                      <button onClick={() => removeBulkMachine(idx)} className="p-2 rounded-lg text-neutral-600 hover:text-rose-400 transition-all" disabled={bulkMachines.length <= 1}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-neutral-800/30">
                  <button onClick={saveBulkMachines} disabled={saving || !bulkMachineLine} className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 disabled:opacity-50 flex items-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar {bulkMachines.filter(m => m.name.trim()).length} máquina(s)
                  </button>
                  <button onClick={() => setShowBulkMachines(false)} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-sm">Cancelar</button>
                </div>
              </div>
            )}

            {filteredMachines.map(machine => (
              <div key={machine.id} className="glass-card rounded-xl p-4 border border-neutral-800/50 flex items-center justify-between">
                {editingId === machine.id ? (
                  <div className="flex-1 flex items-center gap-3 flex-wrap">
                    <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls + ' flex-1'} placeholder="Nombre" />
                    <input type="text" value={editForm.serial_number || ''} onChange={e => setEditForm({ ...editForm, serial_number: e.target.value })} className={inputCls + ' w-40'} placeholder="No. Serie" />
                    <select value={editForm.line_id || ''} onChange={e => setEditForm({ ...editForm, line_id: e.target.value })} className={selectCls}>
                      {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <button onClick={handleSaveMachine} disabled={saving} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (<>
                  <div className="flex items-center gap-3">
                    <Cpu className="w-5 h-5 text-neutral-500" />
                    <div>
                      <span className="text-sm font-medium text-white">{machine.name}</span>
                      {machine.serial_number && (
                        <span className="text-xs text-neutral-500 ml-2 inline-flex items-center gap-1"><Hash className="w-3 h-3" />{machine.serial_number}</span>
                      )}
                      <span className="text-xs text-neutral-600 ml-2">{machine.line_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingId(machine.id); setEditForm({ name: machine.name, serial_number: machine.serial_number || '', line_id: machine.line_id }) }} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => { if (confirm('¿Eliminar?')) { await deleteMachine(machine.id); await loadAll() } }} className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </>)}
              </div>
            ))}
            {filteredMachines.length === 0 && <div className="text-center text-sm text-neutral-500 py-6">No hay máquinas.</div>}
          </div>
        )}

        {/* ── TASKS (bulk add) ── */}
        {tab === 'tasks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                <select value={selectedLineFilter} onChange={e => { setSelectedLineFilter(e.target.value); setSelectedMachineFilter('') }} className={selectCls}>
                  <option value="">Todas las líneas</option>
                  {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select value={selectedMachineFilter} onChange={e => setSelectedMachineFilter(e.target.value)} className={selectCls}>
                  <option value="">Todas las máquinas</option>
                  {(selectedLineFilter ? machines.filter(m => m.line_id == selectedLineFilter) : machines).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => { setShowBulkTasks(true); setBulkTaskMachine(selectedMachineFilter || (machines[0]?.id || '')); setBulkTasks([{ description: '', frequency: 'weekly' }]) }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200">
                <Plus className="w-4 h-4" /> Agregar Tareas
              </button>
            </div>

            {showBulkTasks && (
              <div className="glass-card rounded-xl p-5 border border-blue-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Registro de Tareas</h3>
                  <span className="text-xs text-neutral-500">Enter para agregar otra tarea</span>
                </div>
                <select value={bulkTaskMachine} onChange={e => setBulkTaskMachine(e.target.value)} className={selectCls + ' w-full'}>
                  <option value="">Seleccionar máquina</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({lines.find(l => l.id === m.line_id)?.name})</option>)}
                </select>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_160px_40px] gap-2 text-xs text-neutral-500 px-1">
                    <span>Descripción</span><span>Frecuencia</span><span></span>
                  </div>
                  {bulkTasks.map((t, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_160px_40px] gap-2 animate-fade-in">
                      <input data-bulk-task-desc type="text" placeholder={`Tarea ${idx + 1}`} value={t.description}
                        onChange={e => updateBulkTask(idx, 'description', e.target.value)} onKeyDown={e => handleBulkTaskKeyDown(e, idx)} className={inputCls} autoFocus={idx === bulkTasks.length - 1} />
                      <select value={t.frequency} onChange={e => updateBulkTask(idx, 'frequency', e.target.value)} className={selectCls}>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                        <option value="semiannual">Semestral</option>
                        <option value="annual">Anual</option>
                      </select>
                      <button onClick={() => removeBulkTask(idx)} className="p-2 rounded-lg text-neutral-600 hover:text-rose-400" disabled={bulkTasks.length <= 1}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-neutral-800/30">
                  <button onClick={saveBulkTasks} disabled={saving || !bulkTaskMachine} className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 disabled:opacity-50 flex items-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar {bulkTasks.filter(t => t.description.trim()).length} tarea(s)
                  </button>
                  <button onClick={() => setShowBulkTasks(false)} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-sm">Cancelar</button>
                </div>
              </div>
            )}

            {filteredTasks.map(task => (
              <div key={task.id} className="glass-card rounded-xl p-4 border border-neutral-800/50 flex items-center justify-between gap-3">
                {editingId === task.id ? (
                  <div className="flex-1 space-y-2">
                    <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className={inputCls + ' resize-none h-16'} />
                    <div className="flex items-center gap-2 flex-wrap">
                      <select value={editForm.frequency || ''} onChange={e => setEditForm({ ...editForm, frequency: e.target.value })} className={selectCls}>
                        <option value="weekly">Semanal</option><option value="monthly">Mensual</option>
                        <option value="semiannual">Semestral</option><option value="annual">Anual</option>
                      </select>
                      <button onClick={handleSaveTask} disabled={saving} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (<>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200">{task.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500">{task.machine_name}</span>
                      <span className={`badge ${frequencyColors[task.frequency]} text-[10px]`}>{frequencyLabels[task.frequency]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingId(task.id); setEditForm({ description: task.description, frequency: task.frequency }) }} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => { if (confirm('¿Eliminar?')) { await deleteTask(task.id); await loadAll() } }} className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </>)}
              </div>
            ))}
            {filteredTasks.length === 0 && <div className="text-center text-sm text-neutral-500 py-6">No hay tareas.</div>}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <div className="space-y-4">
            {config.map(c => (
              <div key={c.id} className="glass-card rounded-xl p-4 border border-neutral-800/50">
                <label className="block text-sm text-neutral-400 mb-2">{c.description || c.config_key}</label>
                <div className="flex items-center gap-3">
                  <input type={c.config_key.includes('date') ? 'date' : 'text'} defaultValue={c.config_value}
                    onBlur={e => { if (e.target.value !== c.config_value) handleSaveConfig(c.config_key, e.target.value) }}
                    className={inputCls + ' max-w-xs'} />
                  <span className="text-xs text-neutral-600 font-mono">{c.config_key}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </>)}
    </div>
  )
}
