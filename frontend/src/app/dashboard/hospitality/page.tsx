'use client';
import { useEffect, useState } from 'react';
import { getHospitalityList, updateHospitality } from '@/app/actions/hospitality';
import { Loader2, Hotel, Plane, Car, Info, Calendar, LayoutGrid, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HospitalityHubPage() {
  const [hospRecords, setHospRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetchHosp();
  }, []);

  const fetchHosp = async () => {
    try {
      const res = await getHospitalityList();
      const data = res.data || [];
      setHospRecords(data);
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateHosp = async (id: number, payload: any) => {
    try {
      await updateHospitality(id, payload);
      setHospRecords(prev => prev.map(r => r.id === id ? { ...r, ...payload } : r));
    } catch (err) { console.error(err); }
  };

  const activeRec = hospRecords.find(r => r.id === selectedId);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase italic">Hospitality Hub</h1>
          <p className="text-gray-400 mt-1 text-sm font-bold uppercase tracking-widest leading-none">Global Travel & Logistics Desk</p>
        </div>
      </div>

      {/* Row 2: Event Instance Picker (The "Two-Row" filter) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
          <Calendar className="w-3.5 h-3.5" /> Select Active Deployment
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {loading ? (
            <div className="flex gap-3">
               {[1,2,3].map(i => <div key={i} className="w-40 h-24 bg-gray-100 rounded-3xl animate-pulse" />)}
            </div>
          ) : hospRecords.map(rec => (
            <button 
              key={rec.id}
              onClick={() => setSelectedId(rec.id)} 
              className={`flex flex-col min-w-[200px] max-w-[240px] p-5 rounded-[2rem] border-2 transition-all relative overflow-hidden group ${selectedId === rec.id ? 'bg-black border-black text-white shadow-2xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}
            >
              <div className={`absolute top-0 right-0 w-2 h-full ${selectedId === rec.id ? 'bg-emerald-500' : 'bg-gray-100'}`} />
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 truncate text-left">Deploy ID #{rec.id}</p>
              <p className="text-xs font-black uppercase italic truncate w-full text-left tracking-tight mb-1">{rec.eventTitle || 'Unnamed Event'}</p>
              <div className="flex items-center justify-between mt-auto">
                 <p className="text-[9px] font-bold opacity-50">{new Date(rec.date).toLocaleDateString('en-GB')}</p>
                 {rec.travelFlights && rec.groundDriverContact && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Detailed Management Module */}
      <div className="bg-white border-2 border-gray-50 rounded-[3rem] shadow-[0_30px_60px_rgb(0,0,0,0.04)] p-6 sm:p-10 min-h-[500px]">
        {!activeRec ? (
          <div className="h-96 flex flex-col items-center justify-center text-gray-200">
             <Hotel className="w-20 h-20 mb-4 opacity-50" />
             <p className="text-xs font-black uppercase tracking-[0.3em] italic">No Instance Selected</p>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in duration-500">
             <div className="flex justify-between items-end border-b-2 border-gray-50 pb-6">
                <div>
                   <h2 className="text-3xl font-black tracking-tighter uppercase italic text-gray-900 group-hover:tracking-normal transition-all">{activeRec.eventTitle}</h2>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Operational Logistics Desk</p>
                </div>
                <Link href={`/dashboard/events/${activeRec.eventId}`} className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                   Go to Workspace <ArrowRight className="w-4 h-4" />
                </Link>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-1 gap-10">
                {/* Section 1: Aerial Logistics */}
                <div className="group bg-blue-50/50 p-8 rounded-[2.5rem] border-2 border-blue-100/50 relative overflow-hidden hover:bg-blue-50 transition-colors">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity"><Plane className="w-24 h-24" /></div>
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20"><Plane className="w-6 h-6" /></div>
                      <h3 className="text-lg font-black uppercase tracking-widest text-blue-900 italic">Travel & Flight Itinerary</h3>
                   </div>
                   <textarea 
                      placeholder="Input comprehensive flight data..."
                      defaultValue={activeRec.travelFlights || ''} 
                      onBlur={e => updateHosp(activeRec.id, { travelFlights: e.target.value })}
                      className="w-full px-6 py-5 rounded-3xl border-2 border-blue-100 bg-white text-sm font-bold text-blue-900 focus:outline-none focus:ring-8 focus:ring-blue-500/5 min-h-[150px] shadow-inner"
                   />
                </div>

                {/* Section 2: Ground Deployment */}
                <div className="group bg-emerald-50/50 p-8 rounded-[2.5rem] border-2 border-emerald-100/50 relative overflow-hidden hover:bg-emerald-50 transition-colors">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity"><Car className="w-24 h-24" /></div>
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20"><Car className="w-6 h-6" /></div>
                      <h3 className="text-lg font-black uppercase tracking-widest text-emerald-900 italic">Ground Transport Protocol</h3>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-2">Driver Credentials</label>
                         <input 
                            placeholder="Name & Contact"
                            defaultValue={activeRec.groundDriverContact || ''}
                            onBlur={e => updateHosp(activeRec.id, { groundDriverContact: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl border-2 border-emerald-100 bg-white text-sm font-bold text-emerald-900 focus:outline-none focus:ring-8 focus:ring-emerald-500/5"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-2">Routing Logic</label>
                         <input 
                            placeholder="TBS -> Hotel -> Venue"
                            defaultValue={activeRec.groundRoute || ''}
                            onBlur={e => updateHosp(activeRec.id, { groundRoute: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl border-2 border-emerald-100 bg-white text-sm font-bold text-emerald-900 focus:outline-none focus:ring-8 focus:ring-emerald-500/5"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-2">Final Pickup Time</label>
                         <input 
                            placeholder="HH:MM"
                            defaultValue={activeRec.groundTime || ''}
                            onBlur={e => updateHosp(activeRec.id, { groundTime: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl border-2 border-emerald-100 bg-white text-sm font-bold text-emerald-900 focus:outline-none focus:ring-8 focus:ring-emerald-500/5"
                         />
                      </div>
                   </div>
                </div>

                {/* Section 3: Amenities & Boarding */}
                <div className="group bg-gray-50/50 p-8 rounded-[2.5rem] border-2 border-gray-100 relative overflow-hidden hover:bg-gray-100 transition-colors">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Hotel className="w-24 h-24" /></div>
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/20"><Hotel className="w-6 h-6" /></div>
                      <h3 className="text-lg font-black uppercase tracking-widest text-gray-900 italic">Accommodations & Amenities</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Hotel Selection</label>
                         <input 
                            defaultValue={activeRec.hotelName || ''}
                            onBlur={e => updateHosp(activeRec.id, { hotelName: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white text-sm font-bold text-gray-900 focus:outline-none focus:ring-8 focus:ring-black/5"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Hospitality Rider Notes</label>
                         <textarea 
                            placeholder="Rider requirements, towel count, dietary..."
                            defaultValue={activeRec.amenities || ''}
                            onBlur={e => updateHosp(activeRec.id, { amenities: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white text-sm font-bold text-gray-900 focus:outline-none focus:ring-8 focus:ring-black/5 min-h-[100px]"
                         />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
