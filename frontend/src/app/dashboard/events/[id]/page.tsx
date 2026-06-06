'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getEventById, updateEvent, deleteEvent, getEventAssignments, addEventAssignment, removeEventAssignment } from '@/app/actions/events';
import { getEventTechnicalItems, createTechnicalItem, deleteTechnicalItem } from '@/app/actions/technical';
import { getHospitalityByEventId, updateHospitality, createHospitalityRoom, deleteHospitalityRoom } from '@/app/actions/hospitality';
import { getEventTasks } from '@/app/actions/tasks';
import { getComments, createComment } from '@/app/actions/comments';
import { getDocuments, uploadDocument } from '@/app/actions/documents';
import { getUsers } from '@/app/actions/users';
import { Loader2, ArrowLeft, Calendar, Wrench, Hotel, FileText, DollarSign, Plus, CheckSquare, MessageSquare, Send, Plane, Car, Info, Paperclip, Download, ArrowRight, Users, X } from 'lucide-react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import UploadModal from '@/components/UploadModal';

const TABS = ['Overview', 'Technical', 'Hospitality', 'Documents', 'Budget', 'Threads'];
const TECH_CATEGORIES = ['Stage', 'Lights', 'Sound', 'LED'];
const DOC_CATEGORIES = ['Contract', 'Technical Rider', 'Hospitality Rider', 'Press Kit', 'Invoice', 'Other'];
const BRANDS = ['Rotary Arts', 'MonoHall', 'NOISE', 'KHIDI', 'TES', 'Left Bank', 'Vitamin'];

export default function EventWorkspacePage() {
  const params = useParams();
  const eventId = parseInt(params.id as string);

  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [tech, setTech] = useState<any[]>([]);
  const [hosp, setHosp] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('Overview');

  // Modals
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [techForm, setTechForm] = useState({ category: 'Stage', name: '', specs: '', quantity: 1, cost: 0 });
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { 
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    fetchAll(); 
  }, []);

  const fetchAll = async () => {
    try {
      const [eventRes, techRes, hospRes, taskRes, commentRes, docRes, assignRes, userRes] = await Promise.all([
        getEventById(eventId),
        getEventTechnicalItems(eventId),
        getHospitalityByEventId(eventId),
        getEventTasks(eventId),
        getComments('event', eventId),
        getDocuments(),
        getEventAssignments(eventId),
        getUsers(),
      ]);
      setEvent(eventRes.data);
      setTech(techRes.data || []);
      setHosp(hospRes.data);
      setTasks(taskRes.data || []);
      setComments(commentRes.data || []);
      setDocs((docRes.data || []).filter((d: any) => d.eventId === eventId));
      setAssignments(assignRes.data || []);
      setAllUsers(userRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUploadDoc = async (payload: any) => {
    try {
      const formData = new FormData();
      Object.keys(payload).forEach(key => {
        formData.append(key, payload[key]);
      });
      await uploadDocument(formData);
      // Refresh both docs and tasks as a linked task might have been created
      const [docRes, taskRes] = await Promise.all([
        getDocuments(),
        getEventTasks(eventId)
      ]);
      setDocs((docRes.data || []).filter((d: any) => d.eventId === eventId));
      setTasks(taskRes.data || []);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleAssign = async (userId: number) => {
    try {
      await addEventAssignment(eventId, userId);
      const res = await getEventAssignments(eventId);
      setAssignments(res.data || []);
    } catch (err) { console.error(err); }
  };

  const handleUnassign = async (userId: number) => {
    try {
      await removeEventAssignment(eventId, userId);
      setAssignments(assignments.filter(a => a.userId !== userId));
    } catch (err) { console.error(err); }
  };

  const handleUpdateEvent = async (field: string, value: string) => {
    try {
      await updateEvent(eventId, { [field]: value });
      setEvent({ ...event, [field]: value });
    } catch (err) { console.error(err); }
  };

  const addTechItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTechnicalItem({ ...techForm, eventId });
      setTechModalOpen(false);
      setTechForm({ category: 'Stage', name: '', specs: '', quantity: 1, cost: 0 });
      const res = await getEventTechnicalItems(eventId);
      setTech(res.data || []);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleUpdateHospitality = async (payload: any) => {
    if (!hosp) return;
    try {
      await updateHospitality(hosp.id, payload);
      setHosp({ ...hosp, ...payload });
    } catch (err) { console.error(err); }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    try {
      await createComment({ entityType: 'event', entityId: eventId, content: commentText });
      setCommentText('');
      const res = await getComments('event', eventId);
      setComments(res.data || []);
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async () => {
    if (!confirm('PERMANENT DELETION: This will erase all event data, technical riders, and logs. This action cannot be undone. Continue?')) return;
    try {
      await deleteEvent(eventId);
      window.location.href = '/dashboard/events';
    } catch (err) { console.error(err); alert('Deletion failed'); }
  };

  const handleDeleteTechItem = async (id: number) => {
    if (!confirm('Remove this requirement from the technical rider?')) return;
    try {
      await deleteTechnicalItem(id);
      const res = await getEventTechnicalItems(eventId);
      setTech(res.data || []);
    } catch (err) { console.error(err); }
  };

  const handleAddRoom = async (roomType: string, guestName: string) => {
    try {
      await createHospitalityRoom(hosp.id, roomType, guestName);
      const res = await getHospitalityByEventId(eventId);
      setHosp(res.data);
    } catch (err) { console.error(err); }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm('Delete this room allocation?')) return;
    try {
      await deleteHospitalityRoom(id);
      setHosp({ ...hosp, rooms: hosp.rooms.filter((r: any) => r.id !== id) });
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  if (!event) return <div className="text-center text-gray-500 py-20 font-bold uppercase tracking-tighter">Event Not Found</div>;

  const tabIcons: Record<string, any> = { Overview: Calendar, Technical: Wrench, Hospitality: Hotel, Documents: FileText, Budget: DollarSign };
  const totalBudget = tech.reduce((sum: number, t: any) => sum + (t.cost || 0) * (t.quantity || 1), 0);

  const isManagement = ['General Manager', 'Project Manager', 'Booking Manager'].includes(user?.role);
  const isTech = user?.role === 'Technical Manager';
  const isHosp = user?.role === 'Hospitality Manager';

  const currentTabs = [
    { name: 'Overview', icon: Calendar, visible: true },
    { name: 'Technical', icon: Wrench, visible: ['Admin', 'Director', 'General Manager', 'Project Manager', 'Technical Manager'].includes(user?.role) },
    { name: 'Hospitality', icon: Hotel, visible: ['Admin', 'Director', 'General Manager', 'Project Manager', 'Hospitality Manager'].includes(user?.role) },
    { name: 'Documents', icon: FileText, visible: true },
    { name: 'Budget', icon: DollarSign, visible: ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager'].includes(user?.role) },
  ].filter(t => t.visible).map(t => t.name);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-black group-hover:w-3 transition-all" />
        <Link href="/dashboard/events" className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors self-start border border-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate text-gray-900 uppercase italic">{event.title}</h1>
            <select 
              value={event.organization || ''} 
              onChange={(e) => handleUpdateEvent('organization', e.target.value)}
              className="text-[10px] font-black uppercase tracking-widest bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-4 focus:ring-black/5 cursor-pointer hover:bg-white transition-all"
            >
              <option value="">Select Brand</option>
              {BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest leading-none">
            <span>{new Date(event.date).toLocaleDateString('en-GB')}</span>
            <span>·</span>
            <span>BOOKING #{event.bookingId}</span>
            {event.artistName && (
              <>
                <span>·</span>
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{event.artistName}</span>
              </>
            )}
            {event.agencyName && (
              <>
                <span>·</span>
                <span className="text-gray-500">{event.agencyName}</span>
                {event.agentName && <span className="text-gray-300 ml-1">({event.agentName})</span>}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border-2 ${event.status === 'Upcoming' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{event.status}</span>
          {(user?.role === 'Admin' || user?.role === 'Director' || user?.role === 'General Manager') && (
             <button onClick={handleDeleteEvent} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><X className="w-5 h-5"/></button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/50 p-1.5 rounded-2xl overflow-x-auto shadow-inner no-scrollbar">
        {currentTabs.map(tab => {
          const Icon = tabIcons[tab];
          return <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-5 sm:px-8 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-black shadow-lg scale-[1.03] translate-y-[-1px]' : 'text-gray-400 hover:text-gray-800 hover:bg-white/50'}`}><Icon className="w-4 h-4 shrink-0" />{tab}</button>;
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_20px_50px_rgb(0,0,0,0.03)] p-6 sm:p-10 min-h-[400px]">
        
        {activeTab === 'Hospitality' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="text-2xl font-black tracking-tighter uppercase italic">Hospitality Logistics</h3>
              <div className="flex gap-2">
                 <div className="w-3 h-3 rounded-full bg-blue-500" />
                 <div className="w-3 h-3 rounded-full bg-emerald-500" />
                 <div className="w-3 h-3 rounded-full bg-amber-500" />
              </div>
            </div>

            {!hosp ? (
              <div className="py-20 text-center animate-in fade-in duration-500">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-gray-200" />
                <p className="text-gray-400 mt-6 font-black uppercase tracking-[0.2em] text-[10px]">Synchronizing Logistics Module</p>
                <button 
                  onClick={() => fetchAll()}
                  className="mt-8 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 rounded-2xl transition-all"
                >
                  Force Initialization
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:gap-10">
                {/* Row 1: Travel (Flights) */}
                <div className="group p-8 bg-blue-50/30 rounded-[2rem] border-2 border-blue-100/50 space-y-6 relative overflow-hidden active:scale-[0.99] transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><Plane className="w-20 h-20" /></div>
                  <div className="flex items-center gap-3 text-blue-800">
                    <Plane className="w-6 h-6" />
                    <h4 className="font-black uppercase tracking-[0.2em] text-xs underline decoration-4 underline-offset-8">Travel & Flights</h4>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3">Master Flight & Travel Itinerary</label>
                    <textarea 
                      placeholder="Input flight numbers, airline, connection times and confirmation codes..."
                      defaultValue={hosp.travelFlights || ''} 
                      onBlur={e => handleUpdateHospitality({ travelFlights: e.target.value })}
                      className="w-full px-6 py-5 rounded-3xl border-2 border-blue-100 bg-white text-sm font-bold text-blue-900 placeholder:text-blue-200 focus:outline-none focus:ring-8 focus:ring-blue-500/5 min-h-[120px] transition-all" 
                    />
                  </div>
                </div>

                {/* Row 2: Ground Transportation */}
                <div className="group p-8 bg-emerald-50/30 rounded-[2rem] border-2 border-emerald-100/50 space-y-6 relative overflow-hidden active:scale-[0.99] transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><Car className="w-20 h-20" /></div>
                  <div className="flex items-center gap-3 text-emerald-800">
                    <Car className="w-6 h-6" />
                    <h4 className="font-black uppercase tracking-[0.2em] text-xs underline decoration-4 underline-offset-8">Ground Transport</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Driver Integration Info</label>
                      <input 
                        placeholder="Driver Name / Mobile"
                        defaultValue={hosp.groundDriverContact || ''} 
                        onBlur={e => handleUpdateHospitality({ groundDriverContact: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-emerald-100 bg-white text-sm font-bold text-emerald-900 placeholder:text-emerald-200 focus:outline-none focus:ring-8 focus:ring-emerald-500/5 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Full Route Logic</label>
                      <input 
                        placeholder="Airport -> Hotel -> Venue"
                        defaultValue={hosp.groundRoute || ''} 
                        onBlur={e => handleUpdateHospitality({ groundRoute: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-emerald-100 bg-white text-sm font-bold text-emerald-900 placeholder:text-emerald-200 focus:outline-none focus:ring-8 focus:ring-emerald-500/5 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Target Pickup Timestamp</label>
                      <input 
                        placeholder="e.g. 14:00 (Local Time)"
                        defaultValue={hosp.groundTime || ''} 
                        onBlur={e => handleUpdateHospitality({ groundTime: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-emerald-100 bg-white text-sm font-bold text-emerald-900 placeholder:text-emerald-200 focus:outline-none focus:ring-8 focus:ring-emerald-500/5 transition-all" 
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Hotel & Amenities */}
                <div className="group p-8 bg-gray-50/50 rounded-[2rem] border-2 border-gray-100 space-y-6 relative overflow-hidden active:scale-[0.99] transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Hotel className="w-20 h-20" /></div>
                  <div className="flex items-center gap-3 text-gray-800">
                    <Hotel className="w-6 h-6" />
                    <h4 className="font-black uppercase tracking-[0.2em] text-xs underline decoration-4 underline-offset-8">Accommodations</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Hotel Selection</label>
                      <input 
                        defaultValue={hosp.hotelName || ''} 
                        onBlur={e => handleUpdateHospitality({ hotelName: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white text-sm font-bold text-gray-900 focus:outline-none focus:ring-8 focus:ring-black/5" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Hospitality Rider & Amenities</label>
                      <textarea 
                        placeholder="Water requirements, towel counts, dressing room setup..."
                        defaultValue={hosp.amenities || ''} 
                        onBlur={e => handleUpdateHospitality({ amenities: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-8 focus:ring-black/5 min-h-[100px]" 
                      />
                    </div>
                  </div>

                  {/* Room Management Section */}
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Room Allocations</p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {hosp.rooms?.map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl group">
                            <div>
                               <p className="text-xs font-black text-gray-900 uppercase italic">{r.roomType}</p>
                               <p className="text-[10px] text-gray-400 font-bold uppercase">{r.guestName}</p>
                            </div>
                            <button onClick={() => handleDeleteRoom(r.id)} className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><X className="w-4 h-4"/></button>
                          </div>
                        ))}
                        <button 
                           onClick={() => {
                             const type = prompt('Room Type (e.g. Single, Artist Suite)?');
                             const name = prompt('Guest Name?');
                             if (type && name) handleAddRoom(type, name);
                           }}
                           className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-300 hover:border-black hover:text-black transition-all"
                        >
                           <Plus className="w-3 h-3" /> ADD ROOM
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Documents' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="text-2xl font-black tracking-tighter uppercase italic">Secure Document Vault</h3>
              <button 
                onClick={() => setUploadModalOpen(true)}
                className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-800 transition-all flex items-center gap-2 shadow-2xl shadow-black/20 hover:scale-105 active:scale-95"
              >
                <Paperclip className="w-4 h-4" /> UPLOAD FILE
              </button>
            </div>

            <div className="grid grid-cols-1 gap-10">
              {DOC_CATEGORIES.map(cat => {
                const catDocs = docs.filter(d => d.category === cat || (!d.category && cat === 'Other'));
                return (
                  <div key={cat} className="space-y-5">
                    <div className="flex items-center gap-3">
                       <h4 className="text-[11px] font-black text-black uppercase tracking-[0.3em] pl-2">{cat}</h4>
                       <div className="flex-1 h-[2px] bg-gray-50" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {catDocs.length === 0 ? (
                        <div className="p-8 rounded-[1.5rem] border-2 border-dashed border-gray-100 text-gray-200 text-[10px] font-black uppercase tracking-widest flex items-center justify-center italic">
                          No Files Categorized
                        </div>
                      ) : catDocs.map(doc => (
                        <a 
                          key={doc.id} 
                          href={`${doc.url}?download=`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-5 bg-white border-2 border-gray-50 shadow-sm rounded-2xl flex items-center justify-between group hover:border-black hover:shadow-xl hover:translate-y-[-2px] transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4 overflow-hidden text-left">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-black text-gray-900 truncate tracking-tight">{doc.name}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Added {new Date(doc.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Download className="w-4 h-4 text-gray-300 group-hover:text-black" /></div>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'Overview' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Technical Score', val: tech.length, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
                { label: 'Platform Tasks', val: tasks.length, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
                { label: 'Locked Budget', val: `$${totalBudget.toLocaleString()}`, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
              ].map(stat => (
                <div key={stat.label} className={`p-8 ${stat.bg} ${stat.border} border-2 rounded-[2.5rem] shadow-sm hover:scale-[1.02] transition-all group`}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">{stat.label}</p>
                  <p className={`text-5xl font-black mt-3 tracking-tighter ${stat.text}`}>{stat.val}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Discussion */}
              <div className="space-y-5">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3"><MessageSquare className="w-5 h-5 text-gray-300" /> Platform Comms</h3>
                <div className="bg-gray-50/30 rounded-[2rem] p-6 border-2 border-gray-50 space-y-5 max-h-[450px] overflow-y-auto custom-scrollbar">
                  {comments.length === 0 ? <div className="py-20 text-center font-black text-gray-200 uppercase tracking-widest text-[10px] italic">Thread Initialized - Awaiting Data</div> : comments.map((c: any) => (
                    <div key={c.id} className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-black transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-[10px] text-white font-black">{c.userName?.[0] || 'S'}</div>
                        <div className="leading-none">
                            <p className="text-xs font-black text-gray-900 mb-1">{c.userName || 'Root Admin'}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{c.userRole || 'Team Member'}</p>
                        </div>
                        <span className="text-[9px] font-bold text-gray-300 ml-auto uppercase tracking-tighter">{new Date(c.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 p-2.5 bg-white rounded-3xl border-2 border-gray-50 shadow-lg">
                  <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} className="flex-1 px-5 py-3 text-sm bg-transparent outline-none font-bold placeholder:text-gray-300" placeholder="Type message for the team..." />
                  <button onClick={addComment} className="p-3.5 bg-black text-white rounded-2xl hover:rotate-12 hover:scale-110 transition-all active:scale-95"><Send className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Quick Tasks */}
              <div className="space-y-5">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3"><CheckSquare className="w-5 h-5 text-gray-300" /> Task Priority</h3>
                <div className="space-y-3">
                  {tasks.slice(0, 7).map(task => (
                    <div key={task.id} className="group p-5 bg-white border-2 border-gray-50 rounded-2xl flex items-center justify-between hover:border-black transition-all">
                       <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${task.status === 'Done' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                          <span className={`text-sm font-black tracking-tight ${task.status === 'Done' ? 'text-gray-300 line-through' : 'text-gray-800'}`}>{task.title}</span>
                       </div>
                       <ArrowRight className="w-4 h-4 text-gray-100 group-hover:text-black transition-colors" />
                    </div>
                  ))}
                  {tasks.length === 0 && <div className="py-20 text-center font-black text-gray-200 uppercase tracking-widest text-[10px] italic">Queue Empty</div>}
                  {tasks.length > 7 && <Link href="/dashboard/tasks" className="block text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black transition-colors py-4">View All {tasks.length} Tasks</Link>}
                </div>
              </div>
            </div>

            {/* Operations Team (Admin/Director/Manager Only) */}
            {(user?.role === 'Director' || user?.role === 'General Manager' || user?.role === 'Project Manager') && (
              <div className="pt-10 border-t border-gray-100 space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-black text-xl sm:text-2xl tracking-tighter uppercase italic flex items-center gap-4">
                      <Users className="w-8 h-8 text-indigo-500" /> Operations Team
                    </h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 px-1">Build & Refine the Event Specialist Roster</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <select 
                      className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-3 outline-none focus:ring-8 focus:ring-black/5 hover:bg-white transition-all cursor-pointer"
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val) handleAssign(val);
                        e.target.value = "0";
                      }}
                    >
                      <option value="0">Add Specialist Personnel...</option>
                      {allUsers.filter(u => !assignments.some(a => a.userId === u.id)).map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-5 bg-white border-2 border-gray-50 rounded-[2rem] group hover:border-black hover:shadow-xl transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-black text-xs shadow-lg group-hover:scale-110 transition-transform">{a.userName?.[0]}</div>
                        <div className="leading-tight">
                          <p className="text-sm font-black text-gray-900 leading-none mb-1">{a.userName}</p>
                          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">{a.userRole}</p>
                        </div>
                      </div>
                      <button onClick={() => handleUnassign(a.userId)} className="p-2 text-gray-200 hover:text-red-600 transition-all hover:bg-red-50 rounded-xl"><X className="w-5 h-5" /></button>
                    </div>
                  ))}
                  {assignments.length === 0 && (
                    <div className="col-span-full py-20 text-center rounded-[3rem] border-2 border-dashed border-gray-100">
                      <Users className="w-12 h-12 mx-auto text-gray-100 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 italic">No Operational Attachments Defined</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Technical & Budget sections updated with aesthetic refinement */}
        {activeTab === 'Technical' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl border-2 border-gray-100">
               <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Rider Management</h3>
                  <p className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Equipment Specs</p>
               </div>
               <button onClick={() => setTechModalOpen(true)} className="px-8 py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.05] shadow-2xl shadow-black/20 transition-all flex items-center gap-3"><Plus className="w-5 h-5" /> Add Resource</button>
            </div>
            {TECH_CATEGORIES.map(cat => {
              const catItems = tech.filter((t: any) => t.category === cat);
              if (catItems.length === 0) return null;
              return (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                     <h4 className="text-[11px] font-black text-black uppercase tracking-[0.3em]">{cat}</h4>
                     <div className="flex-1 h-[1px] bg-gray-100" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {catItems.map((item: any) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white border-2 border-gray-50 rounded-[2rem] gap-4 shadow-sm hover:border-black group transition-all">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-black group-hover:text-white transition-all"><Wrench className="w-6 h-6" /></div>
                          <div>
                            <p className="font-black text-lg text-gray-900 tracking-tight uppercase italic mb-1 leading-none">{item.name}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">{item.specs || 'Standard Specification'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                             <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Count</p>
                             <p className="font-black text-sm">{item.quantity}x</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Valuation</p>
                             <p className="font-black text-base text-emerald-600 tracking-tighter italic">${(item.cost || 0).toLocaleString()}</p>
                          </div>
                          <span className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border-2 ${item.status === 'Procured' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>{item.status}</span>
                          <button onClick={() => handleDeleteTechItem(item.id)} className="p-2 text-gray-200 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"><X className="w-5 h-5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'Budget' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="text-2xl font-black tracking-tighter uppercase italic">Ledger & Forecast</h3>
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="group p-10 bg-black rounded-[3rem] shadow-2xl shadow-black/30 text-white relative overflow-hidden transition-all duration-500 hover:p-12">
               <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/20 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-emerald-500/30 transition-all" />
               <p className="text-xs font-black uppercase tracking-[0.4em] opacity-50 mb-4">Total Aggregated Expenditure</p>
               <p className="text-8xl font-black tracking-tighter italic">${totalBudget.toLocaleString()}</p>
               <div className="mt-8 flex gap-4">
                  <div className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">Locked Rate: 1.00 USD</div>
                  <div className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">Status: Healthy</div>
               </div>
            </div>
            
            <div className="bg-white border-2 border-gray-50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50"><th className="py-6 px-10">Resource Description</th><th className="px-6">Module</th><th className="px-6 text-center">Qty</th><th className="px-6 text-right">Unit Val.</th><th className="px-10 text-right">Ext. Total</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {tech.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-all font-bold">
                      <td className="py-6 px-10 text-gray-900 uppercase italic">{item.name}</td>
                      <td className="px-6 text-gray-400 uppercase text-[10px] tracking-widest">{item.category}</td>
                      <td className="px-6 text-center text-gray-400">{item.quantity}</td>
                      <td className="px-6 text-right text-gray-400 font-black tracking-tighter italic">${(item.cost || 0).toLocaleString()}</td>
                      <td className="px-10 text-right text-gray-900 text-lg font-black tracking-tighter italic">${((item.cost || 0) * (item.quantity || 1)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tech.length === 0 && <div className="py-20 text-center font-black text-gray-200 uppercase tracking-widest italic italic">Ledger Empty</div>}
            </div>
          </div>
        )}

        {activeTab === 'Threads' && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-4">
                <MessageSquare className="w-8 h-8 text-indigo-500" /> Team Communication
              </h3>
              <span className="px-5 py-2 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-100">{comments.length} Messages Persisted</span>
            </div>

            <div className="bg-white border-2 border-gray-100 rounded-[3rem] shadow-2xl shadow-black/5 overflow-hidden flex flex-col min-h-[600px]">
              <div className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[500px]">
                {comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-200">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-xs font-black uppercase tracking-[0.3em] italic">No Operational Dialogue Recorded</p>
                  </div>
                ) : (
                  comments.map((c: any) => (
                    <div key={c.id} className="flex gap-5 group">
                      <div className="w-12 h-12 rounded-2xl bg-black text-white shrink-0 flex items-center justify-center font-black text-xs shadow-lg group-hover:scale-110 transition-transform">
                        {c.userName?.[0] || 'U'}
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-black text-sm text-gray-900 leading-none">{c.userName}</p>
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg">{c.userRole}</span>
                          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="p-5 bg-gray-50 rounded-[1.5rem] rounded-tl-none border-2 border-transparent hover:border-black transition-all">
                           <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                             {c.content.split(/(@[\w_]+)/g).map((part: string, i: number) => (
                               part.startsWith('@') ? <span key={i} className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md mx-0.5">{part}</span> : part
                             ))}
                           </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 bg-gray-50/50 border-t-2 border-gray-50 relative">
                <div className="flex items-end gap-4 bg-white p-2 rounded-[2.5rem] border-2 border-gray-100 focus-within:border-black transition-all shadow-xl shadow-black/5 relative">
                  <textarea 
                    value={commentText} 
                    onChange={e => {
                      setCommentText(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addComment();
                      }
                    }}
                    placeholder="Coordinate with teammates (type @ to tag)..."
                    className="flex-1 bg-transparent px-6 py-4 text-sm font-bold focus:outline-none min-h-[60px] max-h-[200px] resize-none"
                  />
                  <button 
                    onClick={addComment}
                    disabled={!commentText.trim() || submitting}
                    className="p-4 bg-black text-white rounded-3xl hover:scale-105 active:scale-95 disabled:bg-gray-200 disabled:scale-100 transition-all shadow-xl shadow-black/20"
                  >
                    <Send className="w-5 h-5" />
                  </button>

                  {/* Simple Tagging Dropdown Mockup */}
                  {commentText.split(/\s/).pop()?.startsWith('@') && (
                    <div className="absolute bottom-full mb-4 left-6 w-64 bg-black rounded-[2rem] shadow-2xl p-4 space-y-2 z-30 ring-8 ring-black/5 animate-in slide-in-from-bottom-2">
                       <p className="text-[9px] font-black text-white/40 uppercase tracking-widest px-3 mb-2">Tag Personnel</p>
                       <div className="max-h-48 overflow-y-auto custom-scrollbar">
                         {allUsers.filter(u => u.name.toLowerCase().includes(commentText.split(/\s/).pop()?.slice(1).toLowerCase() || '')).map(u => (
                           <button 
                            key={u.id}
                            onClick={() => {
                              const words = commentText.split(/\s/);
                              words.pop();
                              setCommentText(words.join(' ') + (words.length > 0 ? ' ' : '') + '@' + u.name.replace(/\s/g, '_') + ' ');
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl transition-all text-left"
                           >
                              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-[10px] text-white">{u.name[0]}</div>
                              <div>
                                <p className="text-xs font-black text-white leading-none mb-1">{u.name}</p>
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">{u.role}</p>
                              </div>
                           </button>
                         ))}
                       </div>
                    </div>
                  )}
                </div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-4 text-center">Transmission restricted to authenticated event personnel</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tech Modal remains consistent with premium styling */}
      <Modal isOpen={techModalOpen} onClose={() => setTechModalOpen(false)} title="Provision New Resource">
        <form onSubmit={addTechItem} className="space-y-8 p-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-black text-gray-300 uppercase tracking-widest mb-3">Resource Slot</label>
              <select value={techForm.category} onChange={e => setTechForm({...techForm, category: e.target.value})} className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-white focus:outline-none focus:ring-8 focus:ring-black/5 font-black uppercase text-xs italic tracking-widest">
                {TECH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-300 uppercase tracking-widest mb-3">Provision Count</label>
              <input type="number" value={techForm.quantity} onChange={e => setTechForm({...techForm, quantity: parseInt(e.target.value)})} className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-white focus:outline-none focus:ring-8 focus:ring-black/5 font-black text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-300 uppercase tracking-widest mb-3">Resource Identification *</label>
            <input required value={techForm.name} onChange={e => setTechForm({...techForm, name: e.target.value})} className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-white focus:outline-none focus:ring-8 focus:ring-black/5 font-black text-sm uppercase italic" placeholder="Enter Full Description..." />
          </div>
          <div>
             <label className="block text-[11px] font-black text-gray-300 uppercase tracking-widest mb-3">Est. Value (Per Unit)</label>
             <input type="number" value={techForm.cost} onChange={e => setTechForm({...techForm, cost: parseFloat(e.target.value)})} className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-white focus:outline-none focus:ring-8 focus:ring-black/5 font-black text-sm" />
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setTechModalOpen(false)} className="px-10 py-4 rounded-2xl text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
            <button type="submit" disabled={submitting} className="px-14 py-4 rounded-[1.5rem] text-[10px] font-black text-white bg-black hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20 uppercase tracking-[0.2em]">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Commit to Rider'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        onUpload={handleUploadDoc}
        users={allUsers}
        eventId={eventId}
      />
    </div>
  );
}
