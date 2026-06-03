'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loader2, Plus, CheckSquare, Clock, CircleDot, Trash2, Calendar, LayoutGrid, ListFilter, Users, Pencil } from 'lucide-react';
import Modal from '@/components/Modal';

const STATUS_OPTIONS = ['Todo', 'In Progress', 'Done'];
const STATUS_COLORS: Record<string, string> = {
  'Todo': 'bg-gray-100 text-gray-700 border-gray-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Done': 'bg-green-50 text-green-700 border-green-200',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', status: 'Todo', deadline: '', eventId: 0, assignedTo: 0 });

  useEffect(() => { 
    const fetchData = async () => {
      try {
        const [taskRes, eventRes, userRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/events'),
          api.get('/users').catch(() => ({ data: [] }))
        ]);
        setTasks(taskRes.data);
        setEvents(eventRes.data);
        setTeam(userRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const fetchTasks = async () => { try { const { data } = await api.get('/tasks'); setTasks(data); } catch (err) { console.error(err); } };

  const startEdit = (task: any) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      status: task.status,
      deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
      eventId: task.eventId || 0,
      assignedTo: task.assignedTo || 0
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setFormData({ title: '', status: 'Todo', deadline: '', eventId: 0, assignedTo: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsSubmitting(true);
    try {
      const payload: any = { title: formData.title, status: formData.status };
      if (formData.deadline) payload.deadline = new Date(formData.deadline).toISOString();
      else payload.deadline = null;
      payload.eventId = formData.eventId || null;
      payload.assignedTo = formData.assignedTo || null;

      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      
      closeModal();
      await fetchTasks();
    } catch (err) { console.error(err); alert('Failed'); } 
    finally { setIsSubmitting(false); }
  };

  const updateStatus = async (id: number, status: string) => { try { await api.put(`/tasks/${id}`, { status }); setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t)); } catch (err) { console.error(err); } };
  const deleteTask = async (id: number) => { 
    if (!confirm('Permanent deletion: confirm task erasure?')) return;
    try { 
      await api.delete(`/tasks/${id}`); 
      setTasks(prev => prev.filter(t => t.id !== id)); 
    } catch (err) { console.error(err); } 
  };

  const filteredTasks = tasks.filter(t => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesEvent = selectedEventId === null || t.eventId === selectedEventId;
    return matchesStatus && matchesEvent;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase italic">Task Command</h1>
          <p className="text-gray-400 mt-1 text-sm font-bold uppercase tracking-widest leading-none">Global Ops & Event Coordination</p>
        </div>
        <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-6 py-3 bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-xs border-2 border-black">
          <Plus className="w-5 h-5" /> Provision Task
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
          <ListFilter className="w-3.5 h-3.5" /> Filter by Status
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['All', ...STATUS_OPTIONS].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap ${statusFilter === s ? 'bg-black text-white border-black shadow-lg translate-y-[-2px]' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
              {s} {s !== 'All' && <span className={`ml-2 px-1.5 py-0.5 rounded-lg text-[9px] ${statusFilter === s ? 'bg-white/20' : 'bg-gray-100'}`}>{tasks.filter(t => t.status === s).length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
          <Calendar className="w-3.5 h-3.5" /> Filter by Event Context
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          <button onClick={() => setSelectedEventId(null)} className={`flex flex-col items-center justify-center min-w-[100px] p-4 rounded-3xl border-2 transition-all group ${selectedEventId === null ? 'bg-black border-black text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}>
            <LayoutGrid className="w-6 h-6 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Global View</span>
          </button>
          {events.map(event => (
            <button key={event.id} onClick={() => setSelectedEventId(event.id)} className={`flex flex-col min-w-[160px] max-w-[200px] p-4 rounded-3xl border-2 transition-all relative overflow-hidden group ${selectedEventId === event.id ? 'bg-black border-black text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}>
              <div className={`absolute top-0 right-0 w-2 h-full ${selectedEventId === event.id ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-black/5'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 truncate w-full text-left">Event #{event.id}</p>
              <p className="text-xs font-black uppercase italic truncate w-full text-left tracking-tighter">{event.title}</p>
              <p className="text-[9px] font-bold mt-1 opacity-60 text-left">{new Date(event.date).toLocaleDateString('en-GB')}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-[0_20px_50px_rgb(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-200" /></div>
        ) : filteredTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-300">
            <CheckSquare className="w-16 h-16 text-gray-50 mb-4" />
            <p className="text-xs font-black uppercase tracking-widest italic tracking-[0.2em]">Queue Neutralized</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredTasks.map(task => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-gray-50/50 transition-all group gap-6 border-l-8 border-transparent hover:border-black">
                  <div className="flex items-center gap-6 min-w-0">
                    <button onClick={() => updateStatus(task.id, task.status === 'Done' ? 'Todo' : task.status === 'Todo' ? 'In Progress' : 'Done')} className="shrink-0 group-hover:scale-125 transition-transform">
                      {task.status === 'Done' ? <CheckSquare className="w-6 h-6 text-emerald-500" /> : task.status === 'In Progress' ? <Clock className="w-6 h-6 text-blue-500 animate-pulse" /> : <CircleDot className="w-6 h-6 text-gray-200" />}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-base font-black uppercase tracking-tight truncate ${task.status === 'Done' ? 'line-through text-gray-300' : 'text-gray-900 group-hover:italic transition-all'}`}>{task.title}</p>
                      <div className="flex flex-wrap items-center gap-6 mt-2">
                        {task.deadline && (
                           <div className="flex items-center gap-2 bg-amber-50/50 px-3 py-1 rounded-xl border border-amber-100">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Target: {new Date(task.deadline).toLocaleDateString('en-GB')}</span>
                           </div>
                        )}
                        {task.eventId > 0 && (
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-xl border border-gray-100">
                             <Calendar className="w-3 h-3 text-gray-400" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">E{task.eventId}</span>
                          </div>
                        )}
                        {task.assignedToName && (
                          <div className="flex items-center gap-2 bg-black text-white px-3 py-1 rounded-xl shadow-lg shadow-black/10">
                             <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[7px] font-black">{task.assignedToName[0]}</div>
                             <span className="text-[10px] font-black uppercase tracking-widest leading-none">{task.assignedToName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${STATUS_COLORS[task.status] || STATUS_COLORS['Todo']}`}>{task.status}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(task)} className="p-2.5 text-gray-300 hover:text-black hover:bg-black/5 rounded-xl transition-all">
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button onClick={() => deleteTask(task.id)} className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTask ? "Refine Objective Status" : "Provision New Resource Task"}>
        <form onSubmit={handleSubmit} className="space-y-6 p-2">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Identification / Objective *</label>
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:ring-8 focus:ring-black/5 text-sm font-bold placeholder:text-gray-200" placeholder="e.g. Confirm VIP Rider fulfillment" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Priority Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-xs font-black uppercase tracking-widest">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Deadline</label>
              <input type="datetime-local" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-sm font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assign to Event Context</label>
              <select value={formData.eventId} onChange={e => setFormData({...formData, eventId: parseInt(e.target.value)})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest">
                <option value={0}>NONE - GLOBAL TASK</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assign to Person</label>
              <select value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: parseInt(e.target.value)})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest">
                <option value={0}>UNASSIGNED</option>
                {team.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="px-6 py-3 rounded-xl text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">Abort</button>
            <button type="submit" disabled={isSubmitting} className="px-10 py-4 rounded-2xl text-xs font-black text-white bg-black hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-black/20 uppercase tracking-[0.2em]">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : (editingTask ? 'Refine Status' : 'Commit Task')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
