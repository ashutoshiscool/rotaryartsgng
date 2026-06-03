'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { CheckCircle2, Clock, MapPin, User, Loader2, Plus, ArrowRight, XCircle, LayoutGrid, List } from 'lucide-react';
import Modal from '@/components/Modal';
import Link from 'next/link';
import Calendar from '@/components/Calendar';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [formData, setFormData] = useState({ 
    artistName: '', 
    agencyName: '', 
    agentName: '',
    brand: '',
    venue: '', 
    status: 'Pending',
    date: '', 
    requestedFee: 0, 
    offeredFee: 0, 
    currency: 'USD', 
    details: '', 
    metrics: { youtube: 0, spotify: 0, instagram: 0 } 
  });

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try { const { data } = await api.get('/bookings'); setBookings(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    setProcessingId(id);
    try { 
      await api.put(`/bookings/${id}`, { status }); 
      await fetchBookings(); 
    }
    catch (err) { console.error(err); alert('Failed to update status'); }
    finally { setProcessingId(null); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanent deletion will remove this booking and any associated event. Continue?')) return;
    try {
      await api.delete(`/bookings/${id}`);
      await fetchBookings();
    } catch (err: any) { 
      console.error(err); 
      const msg = err.response?.data?.error || 'Deletion failed';
      alert(`Error: ${msg}`); 
    }
  };

  const startEdit = (b: any) => {
    setEditingBooking(b);
    setFormData({
      artistName: b.artistName || '',
      agencyName: b.agencyName || '',
      agentName: b.agentName || '',
      brand: b.brand || '',
      venue: b.venue || '',
      status: b.status || 'Pending',
      date: b.date ? new Date(b.date).toISOString().slice(0, 16) : '',
      requestedFee: b.requestedFee || 0,
      offeredFee: b.offeredFee || 0,
      currency: b.currency || 'USD',
      details: b.details || '',
      metrics: b.metrics || { youtube: 0, spotify: 0, instagram: 0 }
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/bookings', { ...formData, date: new Date(formData.date).toISOString() });
      setIsModalOpen(false);
      setFormData({ 
        artistName: '', agencyName: '', agentName: '', brand: '', venue: '', status: 'Pending',
        date: '', requestedFee: 0, offeredFee: 0, currency: 'USD', details: '', 
        metrics: { youtube: 0, spotify: 0, instagram: 0 } 
      });
      await fetchBookings();
    } catch (err) { console.error(err); alert('Failed'); }
    finally { setIsSubmitting(false); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/bookings/${editingBooking.id}`, { ...formData, date: new Date(formData.date).toISOString() });
      setIsEditModalOpen(false);
      setEditingBooking(null);
      await fetchBookings();
    } catch (err) { console.error(err); alert('Update failed'); }
    finally { setIsSubmitting(false); }
  };

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const fmtFee = (val: number | null, currency: string) => {
    if (!val) return '-';
    const sym: Record<string, string> = { USD: '$', EUR: '€', GEL: '₾' };
    return `${sym[currency] || '$'}${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Bookings</h1>
          <p className="text-gray-500 mt-1 text-sm">Review, negotiate, and manage artist booking requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center">
            <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}><List className="w-4 h-4"/></button>
            <button onClick={() => setView('calendar')} className={`p-2 rounded-lg transition-all ${view === 'calendar' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid className="w-4 h-4"/></button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2.5 bg-black text-white rounded-xl font-semibold shadow-md hover:bg-gray-800 transition-all flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <Calendar />
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : bookings.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400"><p className="text-sm font-medium">No bookings found.</p></div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] tracking-widest text-gray-400 font-bold uppercase">
                      <th className="py-4 px-6">Artist & Agency</th>
                      <th className="py-4 px-6">Brand & Agent</th>
                      <th className="py-4 px-6">Venue & Date</th>
                      <th className="py-4 px-6">Financials</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 group-hover:scale-110 transition-transform"><User className="w-4 h-4"/></div>
                            <div>
                              <p className="font-bold text-gray-900 tracking-tight uppercase italic">{b.artistName || 'Unnamed'}</p>
                              <p className="text-gray-400 text-[10px] font-bold uppercase">{b.agencyName || 'No Agency'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                           <div className="space-y-1">
                              <p className="font-bold text-gray-900 text-xs uppercase">{b.brand || '-'}</p>
                              <p className="text-[10px] text-gray-400 font-medium">{b.agentName || 'Individual Agent'}</p>
                           </div>
                        </td>
                        <td className="py-5 px-6">
                          <p className="font-bold text-gray-900 flex items-center gap-1.5 text-sm uppercase italic"><MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0"/> {b.venue}</p>
                          <p className="text-gray-400 text-[10px] font-bold mt-1 tracking-wider uppercase">{b.date ? fmtDate(b.date) : 'TBD'}</p>
                        </td>
                        <td className="py-5 px-6">
                          <div className="space-y-1">
                            <p className="font-black text-emerald-600 text-sm tracking-tight">{fmtFee(b.offeredFee, b.currency)}</p>
                            <p className="text-[9px] text-gray-400 line-through font-bold uppercase">{fmtFee(b.requestedFee, b.currency)} Req.</p>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <select 
                            value={b.status} 
                            onChange={(e) => handleStatusUpdate(b.id, e.target.value)}
                            disabled={processingId === b.id}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-2 outline-none transition-all cursor-pointer ${
                              b.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              b.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="py-5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 text-gray-300">
                            <button onClick={() => startEdit(b)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors hover:text-black">
                              <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(b.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors hover:text-red-600">
                              <XCircle className="w-4 h-4" />
                            </button>
                            {b.status === 'Accepted' && b.eventId ? (
                               <Link href={`/dashboard/events/${b.eventId}`} className="p-2 bg-black text-white rounded-lg hover:scale-105 transition-all text-white"><ArrowRight className="w-4 h-4"/></Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-50">
                {bookings.map(b => (
                  <div key={b.id} className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100"><User className="w-4 h-4"/></div>
                        <div><p className="font-bold text-sm text-gray-900 tracking-tight uppercase italic">{b.artistName}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{b.brand || b.agencyName}</p></div>
                      </div>
                      <select 
                        value={b.status} 
                        onChange={(e) => handleStatusUpdate(b.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-2 ${
                          b.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          b.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                       <div className="space-y-1">
                          <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{b.venue}</p>
                          <p className="font-black text-emerald-600 text-lg">{fmtFee(b.offeredFee, b.currency)}</p>
                       </div>
                       <div className="flex gap-1">
                         <button onClick={() => startEdit(b)} className="p-2 text-gray-300 hover:text-black"><LayoutGrid className="w-4 h-4"/></button>
                         {b.status === 'Accepted' && b.eventId && (
                            <Link href={`/dashboard/events/${b.eventId}`} className="p-2 bg-black text-white rounded-lg"><ArrowRight className="w-4 h-4"/></Link>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Unified Create/Edit Modal */}
      <Modal isOpen={isModalOpen || isEditModalOpen} onClose={() => { setIsModalOpen(false); setIsEditModalOpen(false); setEditingBooking(null); }} title={isEditModalOpen ? "Refine Booking Entry" : "Initiate New Booking"}>
        <form onSubmit={isEditModalOpen ? handleEditSubmit : handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Artist Identification *</label>
              <input required value={formData.artistName} onChange={e => setFormData({ ...formData, artistName: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] focus:border-black focus:bg-white transition-all outline-none font-bold text-sm uppercase italic tracking-tight" placeholder="e.g. Solomun" />
            </div>
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Organization / Brand</label>
               <input value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] focus:border-black focus:bg-white transition-all outline-none font-bold text-sm uppercase italic tracking-tight" placeholder="e.g. MonoHall" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Agency Reference *</label>
              <input required value={formData.agencyName} onChange={e => setFormData({ ...formData, agencyName: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] focus:border-black focus:bg-white transition-all outline-none font-bold text-sm uppercase italic tracking-tight" placeholder="e.g. DIYNAMIC" />
            </div>
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Account Agent</label>
               <input value={formData.agentName} onChange={e => setFormData({ ...formData, agentName: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] focus:border-black focus:bg-white transition-all outline-none font-bold text-sm uppercase italic" placeholder="e.g. John Doe" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Venue Primary Location *</label>
              <input required value={formData.venue} onChange={e => setFormData({ ...formData, venue: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] focus:border-black focus:bg-white transition-all outline-none font-bold text-sm" placeholder="e.g. MonoHall, Tbilisi" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Negotiation Pivot</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] focus:border-black focus:bg-white transition-all outline-none font-black uppercase text-xs tracking-[0.2em] italic cursor-pointer">
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Event Timestamp *</label>
            <input required type="datetime-local" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] focus:border-black focus:bg-white transition-all outline-none font-bold text-sm" />
          </div>

          <div className="grid grid-cols-3 gap-3 p-6 bg-gray-50/50 rounded-[2rem] border-2 border-gray-50">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-1">Requested</label>
              <input type="number" value={formData.requestedFee} onChange={e => setFormData({ ...formData, requestedFee: parseFloat(e.target.value) })} className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none font-black text-sm italic shadow-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-1">Proposed</label>
              <input type="number" value={formData.offeredFee} onChange={e => setFormData({ ...formData, offeredFee: parseFloat(e.target.value) })} className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none font-black text-sm italic shadow-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-1">Currency</label>
              <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none font-black text-[10px] uppercase tracking-tighter cursor-pointer shadow-sm">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GEL">GEL (₾)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 px-1">
            <button type="button" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Abortion</button>
            <button type="submit" disabled={isSubmitting} className="px-12 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20 disabled:bg-gray-400">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-white" /> : (isEditModalOpen ? "+ Update Entry" : "+ Commit Booking")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
