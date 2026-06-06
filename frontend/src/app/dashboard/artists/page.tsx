'use client';
import { useEffect, useState } from 'react';
import { getArtists, createArtist } from '@/app/actions/artists';
import { Loader2, UserPlus, Mail, Phone, Music2, Star } from 'lucide-react';
import Modal from '@/components/Modal';

export default function ArtistsPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', genre: '', email: '', phone: '' });

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      const res = await getArtists();
      if (res.error) throw new Error(res.error);
      setArtists(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createArtist(formData);
      if (res.error) throw new Error(res.error);
      setIsModalOpen(false);
      setFormData({ name: '', genre: '', email: '', phone: '' });
      await fetchArtists();
    } catch (err) {
      console.error(err);
      alert('Failed to add artist');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Artist Roster</h1>
          <p className="text-gray-500 mt-1">Manage signed talent, contacts, and agency details.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-black text-white rounded-xl font-semibold shadow-md hover:bg-gray-800 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Artist
        </button>
      </div>

      {/* Artists Table... */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : artists.length === 0 ? (
           <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <Star className="w-12 h-12 text-gray-200 mb-4" />
              <p>No artists in the roster yet.</p>
           </div>
        ) : (
          <table className="w-full text-left border-collapse">
             <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm tracking-wide text-gray-500 font-semibold uppercase">
                <th className="py-4 px-6 font-semibold">Artist Stage Name</th>
                <th className="py-4 px-6 font-semibold">Genre</th>
                <th className="py-4 px-6 font-semibold">Contact Info</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {artists.map((artist) => (
                <tr key={artist.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                         <Music2 className="w-5 h-5"/>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{artist.name}</p>
                        <p className="text-gray-400 text-xs">ID: #{artist.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-medium text-gray-700 capitalize">
                     {artist.genre || 'Uncategorized'}
                  </td>
                  <td className="py-4 px-6">
                     <div className="space-y-1 text-gray-600">
                       {artist.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5"/> {artist.email}</p>}
                       {artist.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5"/> {artist.phone}</p>}
                       {!artist.email && !artist.phone && <span className="text-gray-400">No contact info</span>}
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Artist Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Artist">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Stage Name / Real Name <span className="text-red-500">*</span></label>
            <input 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black" 
              placeholder="e.g. The Weeknd" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Musical Genre</label>
            <input 
              value={formData.genre}
              onChange={e => setFormData({...formData, genre: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black" 
              placeholder="e.g. R&B / Pop" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <input 
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black" 
                placeholder="contact@artist.com" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
              <input 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black" 
                placeholder="+1 555-0199" 
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
               Cancel
             </button>
             <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-black hover:bg-gray-900 disabled:opacity-50 transition-colors flex items-center gap-2">
               {isSubmitting && <Loader2 className="w-4 h-4 animate-spin"/>}
               Confirm & Add
             </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
