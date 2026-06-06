'use client';
import { useEffect, useState } from 'react';
import { getUsers, createUser } from '@/app/actions/users';
import { getActivityLogs, getSystemSettings, getAdminStats, deleteUser, updateSystemSettings } from '@/app/actions/admin';
import { Loader2, ShieldAlert, UserPlus, ShieldCheck, User as UserIcon, Settings, Activity, Database, Trash2, Save } from 'lucide-react';
import Modal from '@/components/Modal';

const ADMIN_TABS = ['Users', 'Settings', 'Activity Logs', 'Global Data'];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Users');
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User creation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Project Manager' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [usersRes, logsRes, settingsRes, statsRes] = await Promise.all([
        getUsers(),
        getActivityLogs(),
        getSystemSettings(),
        getAdminStats(),
      ]);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
      setSettings(settingsRes.data);
      setGlobalStats(statsRes.data);
      if (usersRes.error) setError(usersRes.error);
      else if (logsRes.error) setError(logsRes.error);
      else if (settingsRes.error) setError(settingsRes.error);
      else if (statsRes.error) setError(statsRes.error);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally { setLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const resCreate = await createUser(formData);
      if (resCreate.error) throw new Error(resCreate.error);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'Project Manager' });
      const res = await getUsers();
      setUsers(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      const res = await deleteUser(id);
      if (res.error) throw new Error(res.error);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await updateSystemSettings(settings);
      if (res.error) throw new Error(res.error);
      setSettings(res.data);
      alert('Settings saved!');
    } catch (err: any) { console.error(err); alert(err.message); }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">Access Restricted</h1>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Admin Panel</h1>
        <p className="text-gray-500 mt-1 text-sm">System administration — users, settings, and monitoring.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {ADMIN_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{tab}</button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-4 sm:p-6 min-h-[300px] sm:min-h-[400px]">
        {/* ─── USERS TAB ─── */}
        {activeTab === 'Users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Team Members ({users.length})</h3>
              <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg flex items-center gap-2"><UserPlus className="w-3.5 h-3.5" /> Invite User</button>
            </div>
            <div className="divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><UserIcon className="w-4 h-4"/></div>
                    <div>
                      <p className="font-semibold text-sm">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${(u.role === 'Director' || u.role === 'General Manager') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {(u.role === 'Director' || u.role === 'General Manager') && <ShieldCheck className="w-3 h-3 inline mr-1" />}{u.role}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => handleDeleteUser(u.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── SETTINGS TAB ─── */}
        {activeTab === 'Settings' && settings && (
          <div className="space-y-6 max-w-lg">
            <h3 className="font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-gray-400" /> System Settings</h3>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Base Currency</label>
              <select value={settings.baseCurrency || 'USD'} onChange={e => setSettings({...settings, baseCurrency: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GEL">GEL (₾)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">EUR → USD Rate</label>
                <input type="number" step="0.01" value={settings.eurExchangeRate || 1.08} onChange={e => setSettings({...settings, eurExchangeRate: parseFloat(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">GEL → USD Rate</label>
                <input type="number" step="0.01" value={settings.gelExchangeRate || 2.65} onChange={e => setSettings({...settings, gelExchangeRate: parseFloat(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
            </div>
            <button onClick={handleSaveSettings} className="px-5 py-2.5 bg-black text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-800 transition-colors"><Save className="w-4 h-4" /> Save Settings</button>
          </div>
        )}

        {/* ─── ACTIVITY LOGS ─── */}
        {activeTab === 'Activity Logs' && (
          <div className="space-y-4">
            <h3 className="font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-gray-400" /> System Activity Log</h3>
            {logs.length === 0 ? <p className="text-sm text-gray-400">No activity recorded yet.</p> : (
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {logs.map((log: any) => (
                  <div key={log.id} className="py-3 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{log.action}</span>
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-medium">{log.entityType} #{log.entityId}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">User #{log.userId} · {new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── GLOBAL DATA ─── */}
        {activeTab === 'Global Data' && globalStats && (
          <div className="space-y-6">
            <h3 className="font-bold flex items-center gap-2"><Database className="w-5 h-5 text-gray-400" /> Global Data Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {Object.entries(globalStats).map(([key, val]) => (
                <div key={key} className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase">{key}</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{val as number}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Invite Team Member">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black" placeholder="jane@rotaryarts.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
            <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black" placeholder="••••••••" />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
              <select 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="Director">Director</option>
                <option value="General Manager">General Manager</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Booking Manager">Booking Manager</option>
                <option value="Technical Manager">Technical Manager</option>
                <option value="Hospitality Manager">Hospitality Manager</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-black hover:bg-gray-900 disabled:opacity-50 transition-colors flex items-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin"/>} Create User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
