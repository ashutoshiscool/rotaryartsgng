'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, CheckSquare, Calendar as CalIcon, User, Layers, X } from 'lucide-react';

interface QuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSuccess: () => void;
}

export default function QuickAssignModal({ isOpen, onClose, selectedDate, onSuccess }: QuickAssignModalProps) {
  const [type, setType] = useState<'task' | 'event'>('task');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    assignedTo: '',
    eventId: '',
  });

  const toggleUser = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [uRes, eRes] = await Promise.all([
            api.get('/users'),
            api.get('/events')
          ]);
          setUsers(uRes.data);
          setEvents(eRes.data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    setIsSubmitting(true);

    try {
      if (type === 'task') {
        await api.post('/tasks', {
          title: formData.title,
          date: selectedDate,
          deadline: selectedDate,
          assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
          eventId: formData.eventId ? parseInt(formData.eventId) : null,
        });
      } else {
        await api.post('/events', {
          title: formData.title,
          date: selectedDate,
          status: 'Upcoming',
          assignedUserIds: selectedUserIds
        });
      }
      onSuccess();
      onClose();
      // Reset
      setFormData({ title: '', assignedTo: '', eventId: '' });
      setSelectedUserIds([]);
    } catch (err) {
      console.error(err);
      alert('Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !selectedDate) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="flex items-center justify-between px-10 py-8 border-b border-white/20 bg-white/40">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Quick Assign</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
              {selectedDate.toLocaleDateString('en-US', { dateStyle: 'full' })}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-black hover:text-white rounded-2xl transition-all shadow-lg hover:scale-110 active:scale-95">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white/60">
          <div className="flex p-2 bg-gray-100/50 rounded-3xl gap-2 backdrop-blur-md border border-white/20">
            {(['task', 'event'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
                  type === t 
                    ? 'bg-black text-white shadow-2xl shadow-black/20 scale-[1.02]' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/30'
                }`}
              >
                {t === 'task' ? <CheckSquare className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2 opacity-60">Assignment Details</label>
              <input 
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-6 py-5 rounded-[2rem] border border-white focus:bg-white focus:border-black outline-none transition-all font-bold text-sm bg-white/50 backdrop-blur-sm shadow-inner"
                placeholder={type === 'task' ? 'e.g. Sign contract' : 'e.g. Music Festival Main Stage'}
              />
            </div>

            {type === 'task' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2 opacity-60">Specialist</label>
                  <div className="relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                      value={formData.assignedTo}
                      onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full pl-14 pr-6 py-5 rounded-[2rem] border border-white bg-white/50 focus:bg-white focus:border-black outline-none transition-all font-black text-[10px] uppercase tracking-widest appearance-none backdrop-blur-sm cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2 opacity-60">Reference Event</label>
                  <div className="relative">
                    <Layers className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                      value={formData.eventId}
                      onChange={e => setFormData({ ...formData, eventId: e.target.value })}
                      className="w-full pl-14 pr-6 py-5 rounded-[2rem] border border-white bg-white/50 focus:bg-white focus:border-black outline-none transition-all font-black text-[10px] uppercase tracking-widest appearance-none backdrop-blur-sm cursor-pointer"
                    >
                      <option value="">General Task</option>
                      {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {type === 'event' && (
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2 opacity-60">Assign Initial Team (Optional)</label>
                <div className="flex flex-wrap gap-2 group-hover:scale-105 transition-all">
                  {users.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                        selectedUserIds.includes(u.id)
                          ? 'bg-black text-white border-black shadow-lg scale-110'
                          : 'bg-white/50 text-gray-400 border-white hover:border-black/20'
                      }`}
                    >
                      {u.name}
                    </button>
                  ))}
                  {users.length === 0 && <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest italic">No personnel found</p>}
                </div>
              </div>
            )}
          </div>

          <button 
            disabled={isSubmitting}
            className="w-full py-6 bg-black text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-black/30 flex items-center justify-center gap-4 group"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Confirm Assignment
                <CheckSquare className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
