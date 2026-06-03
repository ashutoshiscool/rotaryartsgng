'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loader2, FileText, UploadCloud, Download, FileType2, Tag, Filter, Calendar, LayoutGrid, Search } from 'lucide-react';
import Modal from '@/components/Modal';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'Other', eventId: 0, url: '#' });

  useEffect(() => { 
    const fetchData = async () => {
      try {
        const [docRes, eventRes] = await Promise.all([
          api.get('/documents'),
          api.get('/events')
        ]);
        setDocuments(docRes.data);
        setEvents(eventRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const fetchDocuments = async () => {
    try { const { data } = await api.get('/documents'); setDocuments(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/documents', { ...formData, eventId: formData.eventId || null });
      setIsModalOpen(false);
      setFormData({ name: '', category: 'Other', eventId: 0, url: '#' });
      await fetchDocuments();
    } catch (err) { console.error(err); alert('Failed'); }
    finally { setIsSubmitting(false); }
  };

  const filteredDocs = documents.filter(d => {
    const matchesEvent = selectedEventId === null || d.eventId === selectedEventId;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEvent && matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase italic">Resource Vault</h1>
          <p className="text-gray-400 mt-1 text-sm font-bold uppercase tracking-widest leading-none">Centralized Document Management</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-black/20 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3 text-xs border-2 border-black">
          <UploadCloud className="w-5 h-5" /> Provision File
        </button>
      </div>

      {/* Row 1: Search & Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-black transition-colors" />
          <input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search vault archives..." 
            className="w-full pl-12 pr-6 py-4 bg-white border-2 border-gray-100 rounded-3xl outline-none focus:border-black focus:ring-8 focus:ring-black/5 font-bold transition-all" 
          />
        </div>
      </div>

      {/* Row 2: Event Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
          <Calendar className="w-3.5 h-3.5" /> Filter by Target Instance
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          <button 
            onClick={() => setSelectedEventId(null)} 
            className={`flex flex-col items-center justify-center min-w-[100px] p-4 rounded-3xl border-2 transition-all group ${selectedEventId === null ? 'bg-black border-black text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-300 hover:border-gray-300'}`}
          >
            <LayoutGrid className="w-6 h-6 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Global Archives</span>
          </button>
          {events.map(event => (
            <button 
              key={event.id}
              onClick={() => setSelectedEventId(event.id)} 
              className={`flex flex-col min-w-[180px] max-w-[220px] p-4 rounded-3xl border-2 transition-all relative overflow-hidden group ${selectedEventId === event.id ? 'bg-black border-black text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-300 hover:border-gray-300'}`}
            >
              <div className={`absolute top-0 right-0 w-2 h-full ${selectedEventId === event.id ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-black/5'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 truncate w-full text-left">Event ID #{event.id}</p>
              <p className="text-xs font-black uppercase italic truncate w-full text-left tracking-tighter">{event.title}</p>
              <p className="text-[9px] font-bold mt-1 opacity-50 text-left">{new Date(event.date).toLocaleDateString('en-GB')}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-full h-64 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-200" /></div>
        ) : filteredDocs.length === 0 ? (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-300">
            <FileText className="w-16 h-16 text-gray-50 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest italic tracking-[0.2em]">Archive Empty</p>
          </div>
        ) : (
          filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white border-2 border-gray-50 p-6 rounded-[2rem] shadow-sm hover:border-black hover:shadow-2xl hover:translate-y-[-4px] transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-black group-hover:text-white transition-all transform group-hover:rotate-6">
                    <FileText className="w-7 h-7" />
                  </div>
                  <button className="p-3 bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-black uppercase tracking-tighter text-gray-900 group-hover:italic transition-all mb-2 leading-tight truncate">{doc.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-500 rounded-lg">{doc.category || 'Other Resource'}</span>
                  {doc.eventId && <span className="px-3 py-1 bg-indigo-50 text-[9px] font-black uppercase tracking-widest text-indigo-600 rounded-lg">Event #{doc.eventId}</span>}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-50 flex justify-between items-center mt-auto">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Added {new Date(doc.createdAt).toLocaleDateString()}</p>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision New Vault Entry">
        <form onSubmit={handleSubmit} className="space-y-6 p-2">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Resource Name *</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:ring-8 focus:ring-black/5 text-sm font-bold" placeholder="e.g. Master Tech Rider V2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Module Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-xs font-black uppercase tracking-widest outline-none">
                <option value="Riders">Riders</option>
                <option value="Press-kits">Press-kits</option>
                <option value="Contracts & Invoices">Contracts & Invoices</option>
                <option value="Other">Other Resources</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Link to Instance</label>
              <select value={formData.eventId} onChange={e => setFormData({...formData, eventId: parseInt(e.target.value)})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-xs font-black uppercase tracking-widest outline-none">
                <option value={0}>Global Repository</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-gray-300 hover:text-black transition-colors uppercase tracking-widest">Abort</button>
            <button type="submit" disabled={isSubmitting} className="px-14 py-4 rounded-2xl text-xs font-black text-white bg-black hover:scale-[1.03] active:scale-95 transition-all shadow-2xl shadow-black/20 uppercase tracking-[0.2em]">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Commit to Vault'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
