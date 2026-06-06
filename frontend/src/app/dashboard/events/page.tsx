'use client';
import { useEffect, useState } from 'react';
import { getEvents } from '@/app/actions/events';
import Link from 'next/link';
import { Loader2, Calendar as CalIcon, Activity, CheckCircle2, ArrowRight } from 'lucide-react';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const res = await getEvents();
      setEvents(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Events</h1>
        <p className="text-gray-500 mt-1 text-sm">Click any event to open its full workspace.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : events.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400">
            <CalIcon className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm">No events yet. Accept a booking to auto-create one.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map(evt => (
              <Link key={evt.id} href={`/dashboard/events/${evt.id}`} className="flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                    <CalIcon className="w-5 h-5"/>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{evt.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(evt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · Booking #{evt.bookingId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${evt.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {evt.status === 'Upcoming' ? <Activity className="w-3.5 h-3.5"/> : <CheckCircle2 className="w-3.5 h-3.5"/>}
                    {evt.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
