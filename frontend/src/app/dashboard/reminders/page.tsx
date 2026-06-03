'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Loader2,
  Calendar,
  Sparkles,
  Clock,
  ArrowRight
} from 'lucide-react';

interface Reminder {
  id: number;
  text: string;
  isCompleted: number;
  dueDate: string | null;
  createdAt: string;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const res = await fetch('http://127.0.0.1:3001/reminders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setReminders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('http://127.0.0.1:3001/reminders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ 
          text: newText,
          dueDate: newDueDate || null
        })
      });
      if (res.ok) {
        setNewText('');
        setNewDueDate('');
        fetchReminders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReminder = async (id: number, currentStatus: number) => {
    try {
      const res = await fetch(`http://127.0.0.1:3001/reminders/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ isCompleted: currentStatus === 1 ? 0 : 1 })
      });
      if (res.ok) {
        setReminders(reminders.map(r => r.id === id ? { ...r, isCompleted: currentStatus === 1 ? 0 : 1 } : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReminder = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`http://127.0.0.1:3001/reminders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/20 shadow-xl shadow-indigo-500/5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Personal Workspace</h1>
          </div>
          <p className="text-gray-500 font-medium pl-1">Detailed notes and scheduled follow-ups.</p>
        </div>
        
        <form onSubmit={addReminder} className="space-y-4">
          <div className="relative group">
            <textarea
              placeholder="What needs to stay on your radar?"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="w-full bg-white/80 backdrop-blur-sm border-2 border-indigo-100/50 rounded-3xl py-6 px-8 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 font-medium shadow-inner min-h-[120px] resize-none"
            />
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 group w-full">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                <Clock className="w-5 h-5" />
              </div>
              <input
                type="datetime-local"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full bg-white/80 backdrop-blur-sm border-2 border-indigo-100/50 rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-gray-700 shadow-inner"
              />
            </div>
            <button
              disabled={submitting}
              className="w-full md:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 font-bold flex items-center justify-center gap-3"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Save Reminder</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* List Container */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-2xl overflow-hidden">
        {reminders.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto opacity-50">
              <Plus className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium text-lg italic">Your personal board is clear. Add something above!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/50">
            {reminders.map((reminder) => (
              <div 
                key={reminder.id}
                className={`group flex items-start justify-between p-8 hover:bg-white/40 transition-all ${reminder.isCompleted ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-6 flex-1 cursor-pointer" onClick={() => toggleReminder(reminder.id, reminder.isCompleted)}>
                  <button className={`mt-1 flex-shrink-0 transition-transform active:scale-90 ${reminder.isCompleted ? 'text-green-500' : 'text-gray-300 hover:text-indigo-400'}`}>
                    {reminder.isCompleted ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                  </button>
                  <div className="space-y-3">
                    <p className={`text-xl font-bold tracking-tight leading-relaxed transition-all ${reminder.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {reminder.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      {reminder.dueDate ? (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                          new Date(reminder.dueDate) < new Date() && !reminder.isCompleted 
                            ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                            : 'bg-indigo-50 text-indigo-500 border border-indigo-100'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(reminder.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100">
                           <Calendar className="w-3.5 h-3.5" />
                           Added {new Date(reminder.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteReminder(reminder.id); }}
                  className="p-3 bg-red-50 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
