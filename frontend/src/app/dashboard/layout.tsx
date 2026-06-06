'use client';
import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getReminders } from '@/app/actions/reminders';
import { 
  Calendar, 
  LayoutDashboard, 
  Ticket, 
  Users, 
  FileText, 
  LogOut, 
  Loader2, 
  CheckSquare, 
  CalendarDays, 
  ShieldCheck, 
  Menu, 
  X, 
  Bell,
  Sparkles
} from 'lucide-react';

const ROLE_NAV_MAP: Record<string, string[]> = {
  'Director': ['Dashboard', 'Bookings', 'Events', 'Tasks', 'Documents', 'Calendar', 'Reminders', 'Admin Panel'],
  'General Manager':   ['Dashboard', 'Bookings', 'Events', 'Tasks', 'Documents', 'Calendar', 'Reminders', 'Admin Panel'],
  'Project Manager':   ['Dashboard', 'Bookings', 'Events', 'Tasks', 'Documents', 'Calendar', 'Reminders'],
  'Booking Manager':   ['Dashboard', 'Bookings', 'Events', 'Tasks', 'Documents', 'Calendar', 'Reminders'],
  'Technical Manager': ['Dashboard', 'Events', 'Tasks', 'Calendar', 'Reminders'],
  'Hospitality Manager': ['Dashboard', 'Events', 'Tasks', 'Calendar', 'Reminders'],
};

const ALL_NAV_ITEMS = [
  { name: 'Dashboard',    href: '/dashboard',            icon: LayoutDashboard },
  { name: 'Bookings',     href: '/dashboard/bookings',   icon: Ticket },
  { name: 'Events',       href: '/dashboard/events',     icon: Calendar },
  { name: 'Tasks',        href: '/dashboard/tasks',      icon: CheckSquare },
  { name: 'Documents',    href: '/dashboard/documents',  icon: FileText },
  { name: 'Calendar',     href: '/dashboard/calendar',   icon: CalendarDays },
  { name: 'Reminders',    href: '/dashboard/reminders',  icon: Bell },
  { name: 'Admin Panel',  href: '/dashboard/admin',      icon: ShieldCheck },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const [remIndex, setRemIndex] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); }
    else {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    }
  }, [router]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await getReminders();
      setReminders((res.data || []).filter((r: any) => r.isCompleted === 0));
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    if (user) fetchReminders();
    // Refresh every 30s to keep "reminding"
    const interval = setInterval(() => { if(user) fetchReminders(); }, 30000);
    return () => clearInterval(interval);
  }, [user, fetchReminders]);

  const dismissRem = (id: number) => {
    setHiddenIds([...hiddenIds, id]);
  };

  const visibleReminders = reminders.filter(r => !hiddenIds.includes(r.id));

  if (!user) {
    return <div className="h-screen flex items-center justify-center bg-[#FBFBFB]"><Loader2 className="animate-spin w-8 h-8 text-gray-400"/></div>;
  }

  const role = user.role;
  let allowedNames = ROLE_NAV_MAP[role];

  // Graceful fallback for legacy roles to prevent empty sidebar
  if (!allowedNames) {
    if (['Director', 'Admin', 'GM'].includes(role)) {
      allowedNames = ROLE_NAV_MAP['General Manager'];
    } else if (role === 'Booking Agent') {
      allowedNames = ROLE_NAV_MAP['Booking Manager'];
    } else if (role === 'Technical') {
      allowedNames = ROLE_NAV_MAP['Technical Manager'];
    } else if (role === 'Hospitality') {
      allowedNames = ROLE_NAV_MAP['Hospitality Manager'];
    } else {
      allowedNames = ['Dashboard'];
    }
  }

  const navItems = ALL_NAV_ITEMS.filter(item => allowedNames.includes(item.name));

  const SidebarContent = () => (
    <>
      <div className="px-5 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg shrink-0 overflow-hidden group-hover:scale-110 transition-transform">
          <img src="/branding/logo.svg" alt="Rotary Arts" className="w-8 h-8 object-contain" />
        </div>
        <span className="font-bold text-xl tracking-tight">Rotary Arts</span>
      </div>
      
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-black text-white shadow-md shadow-black/10' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}>
              <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 mt-auto">
        <div className="p-3 bg-gray-50 rounded-2xl mb-3 border border-gray-100">
          <p className="text-sm font-bold truncate">{user.name}</p>
          <p className="text-xs text-gray-500 font-medium capitalize mt-0.5">{user.role}</p>
        </div>
        <button 
          onClick={() => { localStorage.clear(); router.push('/'); }} 
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 font-semibold hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex bg-[#FBFBFB] min-h-screen text-gray-900 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[260px] border-r border-gray-200 bg-white flex-col pt-6 pb-4 shadow-sm z-20 fixed h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-[280px] max-w-[80vw] h-full bg-white flex flex-col pt-6 pb-4 shadow-xl animate-in slide-in-from-left duration-200">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-x-hidden lg:ml-[260px]">
        <header className="h-[56px] lg:h-[64px] flex items-center justify-between px-4 lg:px-8 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 w-full">
           {/* Mobile hamburger */}
           <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-1 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
             <Menu className="w-5 h-5" />
           </button>
            <div className="hidden sm:flex items-center gap-4">
               <div className="text-sm text-gray-400 font-medium whitespace-nowrap">
                 {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
               </div>
               
               {visibleReminders.length > 0 && visibleReminders[remIndex] && (
                 <div className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/20 animate-in slide-in-from-right-10 duration-700 max-w-[400px]">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest truncate leading-none pt-0.5">
                        {visibleReminders[remIndex].text}
                      </span>
                      {visibleReminders[remIndex].dueDate && (
                        <span className="text-[8px] font-bold text-indigo-200 uppercase tracking-tighter mt-0.5">
                          {new Date(visibleReminders[remIndex].dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(visibleReminders[remIndex].dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => dismissRem(visibleReminders[remIndex].id)}
                      className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors active:scale-90 shrink-0"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                 </div>
               )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">{user.role}</span>
            </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
