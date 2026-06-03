'use client';
import { useState } from 'react';
import Calendar from '@/components/Calendar';
import QuickAssignModal from '@/components/QuickAssignModal';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setModalOpen(true);
  };

  const handleRefresh = () => {
    // Trigger the internal fetcher in our component
    if ((window as any).refreshCalendar) {
      (window as any).refreshCalendar();
    }
  };

  return (
    <div className="mesh-bg min-h-screen p-4 sm:p-10 space-y-10 animate-in fade-in duration-1000">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic text-gray-900 leading-none">
            Operational <span className="text-gray-400 not-italic">Forecast</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mt-3 px-1 border-l-2 border-black/10 h-3 flex items-center">
            Events & System Deliverables
          </p>
        </div>
        <div className="flex flex-wrap gap-4 glass-card px-8 py-4 rounded-[2rem] border-white/50 bg-white/40 backdrop-blur-md shadow-xl shadow-black/5">
           <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Events</span></div>
           <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Tasks</span></div>
           <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Deliverables</span></div>
        </div>
      </div>

      <div className="relative">
        <Calendar 
          onDateClick={handleDateClick} 
          selectedDate={selectedDate}
        />
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
