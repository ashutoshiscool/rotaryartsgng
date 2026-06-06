'use client';
import { useEffect, useState } from 'react';
import { getBookings } from '@/app/actions/bookings';
import { getEvents } from '@/app/actions/events';
import { getTasks } from '@/app/actions/tasks';
import { getDocuments } from '@/app/actions/documents';
import { Ticket, Calendar as CalIcon, CheckSquare, FileText, Activity, Clock, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Calendar from '@/components/Calendar';
import QuickAssignModal from '@/components/QuickAssignModal';

export default function Dashboard() {
  const [stats, setStats] = useState({ bookings: 0, events: 0, tasks: 0, documents: 0 });
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const [b, e, t, d] = await Promise.all([
          getBookings().catch(() => ({ data: [] })),
          getEvents().catch(() => ({ data: [] })),
          getTasks().catch(() => ({ data: [] })),
          getDocuments().catch(() => ({ data: [] })),
        ]);
        setStats({ 
          bookings: b.data?.length || 0, 
          events: e.data?.length || 0, 
          tasks: t.data?.length || 0, 
          documents: d.data?.length || 0 
        });
        setMyTasks((t.data || []).filter((task: any) => task.assignedTo === storedUser.id && task.status !== 'Done'));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setModalOpen(true);
  };

  const handleRefresh = () => {
    if ((window as any).refreshCalendar) {
      (window as any).refreshCalendar();
    }
  };

  const statCards = [
    { label: 'Bookings', value: stats.bookings, icon: Ticket, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/dashboard/bookings' },
    { label: 'Active Events', value: stats.events, icon: CalIcon, color: 'text-blue-600', bg: 'bg-blue-50', href: '/dashboard/events' },
    { label: 'Pending Tasks', value: stats.tasks, icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50', href: '/dashboard/tasks' },
    { label: 'Documents', value: stats.documents, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/dashboard/documents' },
  ];

  return (
    <div className="mesh-bg min-h-screen p-4 sm:p-10 space-y-10 animate-in fade-in duration-1000">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter italic text-gray-900 leading-none">
            Operational <span className="text-gray-400 not-italic">Intelligence</span>
          </h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-3 border-l-2 border-black/10 px-2">Rotary Arts Management System</p>
        </div>
        <div className="flex items-center gap-4 glass-card px-8 py-4 rounded-[2rem] border-white/50 bg-white/40 backdrop-blur-md shadow-xl shadow-black/5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700">All Systems Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map(card => (
          <Link key={card.label} href={card.href} className="group glass-card p-6 sm:p-8 rounded-[2.5rem] border-white/50 bg-white/30 backdrop-blur-sm hover:border-black hover:translate-y-[-4px] transition-all duration-500 shadow-xl shadow-black/5">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-black text-gray-400 group-hover:text-gray-900 uppercase tracking-[0.2em] transition-colors">{card.label}</p>
              <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center ${card.color} group-hover:scale-110 transition-all duration-500 shadow-sm`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-5xl font-black text-gray-900 tracking-tighter italic">
              {loading ? <Loader2 className="w-8 h-8 animate-spin text-gray-300" /> : card.value.toLocaleString()}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-gray-900">Organizational Pulse</h2>
          </div>
          <div className="relative">
            <Calendar 
              onDateClick={handleDateClick}
              selectedDate={selectedDate}
            />
          </div>
        </div>

        <div className="space-y-10">
          <div className="glass-card p-8 rounded-[3rem] border-white/50 bg-white/40 backdrop-blur-md shadow-2xl shadow-black/5">
             <div className="flex items-center justify-between mb-8 border-b border-black/5 pb-4">
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-900 italic">My Assignments</h3>
                <CheckSquare className="w-4 h-4 text-gray-300" />
             </div>
             <div className="space-y-4">
                {myTasks.length === 0 ? (
                   <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center py-6">No Pending Responsibilities</p>
                ) : (
                   myTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="group p-4 bg-white/60 rounded-2xl border border-white hover:border-black transition-all">
                         <p className="text-xs font-black uppercase italic tracking-tight text-gray-900 group-hover:translate-x-1 transition-transform">{task.title}</p>
                         <div className="flex items-center justify-between mt-2">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                               {task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB') : 'No Deadline'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border ${
                               task.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                            }`}>{task.status}</span>
                         </div>
                      </div>
                   ))
                )}
                {myTasks.length > 5 && (
                   <Link href="/dashboard/tasks" className="block text-center text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 pt-2 transition-colors">
                      View all {myTasks.length} assignments →
                   </Link>
                )}
             </div>
          </div>

          <div className="glass-card p-10 rounded-[3rem] border-white/50 bg-white/40 backdrop-blur-md shadow-2xl shadow-black/5">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-900 italic mb-8 border-b border-black/5 pb-4">Recent Activity</h3>
            <div className="space-y-6">
              {stats.bookings > 0 ? (
                <div className="flex items-start gap-5 p-5 bg-white/60 rounded-3xl border border-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-2 shrink-0 animate-pulse" />
                  <div>
                    <p className="text-sm font-black text-gray-900 tracking-tight uppercase">System Online</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{stats.bookings} bookings active</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-black/5 rounded-3xl border-2 border-dashed border-black/5 opacity-40">
                  <Activity className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting system input...</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-10 rounded-[3rem] bg-black text-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-white/10 transition-all duration-1000" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-2xl group-hover:bg-indigo-500/20 transition-all duration-1000" />
            
            <h3 className="text-xs font-black uppercase tracking-[0.4em] opacity-40 mb-6 flex items-center gap-3">
              <Clock className="w-4 h-4" /> System Metrics
            </h3>
            <div className="space-y-4 relative z-10">
              {[
                { label: 'Infrastructure', status: 'Healthy' },
                { label: 'Logic Layer', status: 'Enforced' },
                { label: 'Aesthetics', status: 'Premium' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-xl transition-colors">
                  <span className="text-white/60 font-black text-[10px] uppercase tracking-widest">{item.label}</span>
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[9px] font-black uppercase tracking-widest border border-white/10">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <QuickAssignModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedDate={selectedDate}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
