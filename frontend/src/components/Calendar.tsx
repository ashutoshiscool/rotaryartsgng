'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalIcon, Ticket, CheckSquare } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  event: 'bg-blue-100 text-blue-800 border-blue-200',
  task: 'bg-amber-100 text-amber-800 border-amber-200',
  booking: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const TYPE_ICONS: Record<string, any> = {
  event: CalIcon,
  task: CheckSquare,
  booking: Ticket,
};

interface CalendarProps {
  compact?: boolean;
  onDateClick?: (date: Date) => void;
  onItemClick?: (item: any) => void;
  selectedDate?: Date | null;
}

export default function Calendar({ 
  compact = false, 
  onDateClick, 
  onItemClick,
  selectedDate 
}: CalendarProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    try {
      const { data } = await api.get('/calendar');
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Expose fetcher for parent to refresh
  (window as any).refreshCalendar = fetchCalendar;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const getItemsForDay = (day: number) => {
    return items.filter((item) => {
      const d = new Date(item.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-[2.5rem] overflow-hidden transition-all duration-700">
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/40 bg-white/40 backdrop-blur-md">
        <button onClick={prevMonth} className="p-3 hover:bg-black hover:text-white rounded-2xl transition-all shadow-lg hover:scale-110 active:scale-95">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-900 italic">
          {currentMonth.toLocaleDateString('en-US', { month: 'long' })} <span className="text-gray-300 font-bold not-italic">{year}</span>
        </h2>
        <button onClick={nextMonth} className="p-3 hover:bg-black hover:text-white rounded-2xl transition-all shadow-lg hover:scale-110 active:scale-95">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-white/20 bg-white/10 backdrop-blur-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
          <div
            key={i}
            className="py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 relative">
        {days.map((day, idx) => {
          const dayItems = day ? getItemsForDay(day) : [];
          return (
            <div
              key={idx}
              onClick={() => day && onDateClick?.(new Date(year, month, day))}
              className={`min-h-[70px] sm:min-h-[130px] p-2 border-b border-r border-white/20 flex flex-col relative group cursor-pointer transition-all hover:bg-white/40 ${
                !day ? 'bg-white/5 grayscale opacity-20' : ''
              } ${day && isToday(day) ? 'bg-indigo-50/20' : ''} ${day && isSelected(day) ? 'ring-2 ring-black ring-inset bg-white/50' : ''}`}
            >
              {day && (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[10px] sm:text-sm font-black italic tracking-tighter ${
                        isToday(day)
                          ? 'bg-black text-white w-7 h-7 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center scale-110 shadow-xl'
                          : 'text-gray-900 group-hover:scale-110 transition-transform'
                      }`}
                    >
                      {day}
                    </span>
                    {dayItems.length > 0 && <div className="sm:hidden w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
                  </div>
                  <div className="space-y-1.5 overflow-hidden">
                    {dayItems.slice(0, compact ? 1 : 3).map((item) => {
                      const Icon = TYPE_ICONS[item.type] || CalIcon;
                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                          className={`glass-pill flex items-center gap-1.5 px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight border shadow-sm truncate hover:scale-[1.05] active:scale-95 transition-all ${
                            TYPE_COLORS[item.type] || TYPE_COLORS.event
                          }`}
                          title={item.title}
                        >
                          <Icon className="w-3 h-3 shrink-0 opacity-50" />
                          <span className="truncate">{item.title}</span>
                        </div>
                      );
                    })}
                    {dayItems.length > (compact ? 1 : 3) && (
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1 pt-1 opacity-60">
                        + {dayItems.length - (compact ? 1 : 3)} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
