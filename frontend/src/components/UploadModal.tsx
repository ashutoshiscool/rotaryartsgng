'use client';
import { useState } from 'react';
import { Loader2, FileText, CheckCircle2, Calendar, User, Info, Paperclip } from 'lucide-react';
import Modal from './Modal';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: any) => Promise<void>;
  users: any[];
  eventId: number;
}

export default function UploadModal({ isOpen, onClose, onUpload, users, eventId }: UploadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docData, setDocData] = useState({
    name: '',
    category: 'Other',
  });

  const [createTask, setCreateTask] = useState(false);
  const [taskData, setTaskData] = useState({
    title: '',
    assignedTo: '',
    deadline: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', docData.name || selectedFile.name);
      formData.append('category', docData.category);
      formData.append('eventId', eventId.toString());
      formData.append('entityType', 'event');
      formData.append('entityId', eventId.toString());

      if (createTask && taskData.title) {
        formData.append('task', JSON.stringify({
          ...taskData,
          assignedTo: taskData.assignedTo ? parseInt(taskData.assignedTo) : null
        }));
      }

      await onUpload(formData);
      onClose();
      // Reset
      setSelectedFile(null);
      setDocData({ name: '', category: 'Other' });
      setCreateTask(false);
      setTaskData({ title: '', assignedTo: '', deadline: '' });
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const CATEGORIES = ['Contract', 'Technical Rider', 'Hospitality Rider', 'Press Kit', 'Invoice', 'Other'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Secure Document Upload">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          {/* File Picker Zone */}
          <div className="relative group">
            <input 
              type="file" 
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  if (!docData.name) setDocData(prev => ({ ...prev, name: file.name }));
                  if (!taskData.title) setTaskData(prev => ({ ...prev, title: `Review: ${file.name}` }));
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`p-10 border-2 border-dashed rounded-[2.5rem] text-center transition-all ${selectedFile ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-100 group-hover:border-black'}`}>
              {!selectedFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-xl shadow-black/5 mx-auto flex items-center justify-center text-gray-400 group-hover:scale-110 group-hover:bg-black group-hover:text-white transition-all">
                    <Paperclip className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-gray-900 leading-none mb-2">Drop local file here</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">or click to browse filesystem</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                   <div className="w-16 h-16 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/20 mx-auto flex items-center justify-center text-white">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-emerald-900 leading-none mb-1 truncate px-4">{selectedFile.name}</p>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-tight">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB · READY FOR DEP-SYNC</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:underline"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-2">Identification Label</label>
              <input 
                value={docData.name}
                onChange={e => setDocData({ ...docData, name: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50/30 focus:bg-white focus:border-black outline-none transition-all font-bold text-sm"
                placeholder="e.g. Talent Contract v2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-2">Classification</label>
              <select 
                value={docData.category}
                onChange={e => setDocData({ ...docData, category: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50/30 focus:bg-white focus:border-black outline-none transition-all font-bold text-sm"
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Task Integration */}
        <div className={`p-6 rounded-[2rem] border-2 transition-all ${createTask ? 'bg-amber-50/30 border-amber-100' : 'bg-gray-50/50 border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <div className={`p-2 rounded-xl ${createTask ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-400'}`}>
                 <CheckCircle2 className="w-4 h-4" />
               </div>
               <div>
                  <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Create Tracking Task</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Assign follow-up action to teammate</p>
               </div>
             </div>
             <button 
              type="button"
              onClick={() => setCreateTask(!createTask)}
              className={`w-12 h-6 rounded-full relative transition-all ${createTask ? 'bg-black' : 'bg-gray-300'}`}
             >
               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${createTask ? 'left-7' : 'left-1'}`} />
             </button>
          </div>

          {createTask && (
            <div className="space-y-4 pt-4 border-t border-amber-100/50 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-[9px] font-black text-amber-600/50 uppercase tracking-widest mb-1">Task Description</label>
                <input 
                  value={taskData.title}
                  onChange={e => setTaskData({ ...taskData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-amber-100 bg-white text-xs font-bold text-gray-900 focus:outline-none"
                  placeholder="e.g. Sign and return riders"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[9px] font-black text-amber-600/50 uppercase tracking-widest mb-1">Assign To</label>
                   <select 
                    value={taskData.assignedTo}
                    onChange={e => setTaskData({ ...taskData, assignedTo: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-amber-100 bg-white text-xs font-bold text-gray-900 focus:outline-none"
                   >
                     <option value="">Choose Personnel...</option>
                     {users.map(u => (
                       <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="block text-[9px] font-black text-amber-600/50 uppercase tracking-widest mb-1">Deadline</label>
                   <input 
                    type="date"
                    value={taskData.deadline}
                    onChange={e => setTaskData({ ...taskData, deadline: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-amber-100 bg-white text-xs font-bold text-gray-900 focus:outline-none"
                   />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-all border-2 border-transparent"
          >
            Abort
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white bg-black hover:bg-gray-800 shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            INITIATE UPLOAD
          </button>
        </div>
      </form>
    </Modal>
  );
}
