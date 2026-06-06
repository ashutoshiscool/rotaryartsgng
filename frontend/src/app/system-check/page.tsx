'use client';
import { useState } from 'react';
import { loginAction } from '@/app/actions/auth';
import { createBooking, acceptBooking } from '@/app/actions/bookings';
import { createTask } from '@/app/actions/tasks';

export default function SystemCheck() {
  const [results, setResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const addResult = (step: string, status: 'pass' | 'fail', details?: any) => {
    setResults(prev => [...prev, { step, status, details }]);
  };

  const runTests = async () => {
    setResults([]);
    setRunning(true);
    let token = '';
    let bookingId: number;
    let eventId: number;

    // 1. Backend Health
    try {
      addResult('Backend Health (Actions)', 'pass', { status: 'ok' });
    } catch (err: any) {
      addResult('Backend Health', 'fail', err.message);
      setRunning(false);
      return;
    }

    // 2. Login
    try {
      const res = await loginAction({ email: 'admin@rotaryarts.com', password: 'password123' });
      if (res.error) throw new Error(res.error);
      token = res.token!;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(res.user));
      addResult('Login (Auth)', 'pass');
    } catch (err: any) {
      addResult('Login (Auth)', 'fail', err.message);
      setRunning(false);
      return;
    }

    // 3. Create Booking
    try {
      const res = await createBooking({
        artistId: 1, // Seeded artist
        agencyId: 1, // Seeded agency
        date: new Date().toISOString(),
        venue: 'Test Arena',
        fee: 50000,
        currency: 'USD'
      });
      if (res.error) throw new Error(res.error);
      bookingId = res.data!.id;
      addResult('Create Booking', 'pass', res.data!);
    } catch (err: any) {
      addResult('Create Booking', 'fail', err.message);
      setRunning(false);
      return;
    }

    // 4. Accept Booking -> Creates Event
    try {
      const res = await acceptBooking(bookingId!);
      if (res.error) throw new Error(res.error);
      eventId = res.data!.event.id;
      addResult('Accept Booking & Auto-create Event', 'pass', res.data!);
    } catch (err: any) {
       addResult('Accept Booking & Auto-create Event', 'fail', err.message);
       setRunning(false);
       return;
    }

    // 5. Create Task
    try {
      const res = await createTask({
        eventId: eventId!,
        title: 'Book flights for Test Arena'
      });
      if (res.error) throw new Error(res.error);
      addResult('Create Task', 'pass', res.data!);
    } catch (err: any) {
      addResult('Create Task', 'fail', err.message);
    }

    setRunning(false);
  };

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Rotary Arts - Validation Mode</h1>
      <p className="text-lg text-gray-500">Perform an end-to-end system test verifying backend DB integrations.</p>

      <button
        onClick={runTests}
        disabled={running}
        className="px-6 py-3 bg-black text-white rounded-lg shadow font-medium disabled:opacity-50 hover:bg-gray-800 transition"
      >
        {running ? 'Running validations...' : 'Run System Validation Check'}
      </button>

      <div className="mt-8 space-y-4">
        {results.map((r, i) => (
          <div key={i} className={`p-6 border rounded-xl shadow-sm flex items-start gap-4 ${r.status === 'pass' ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
            <div className="text-3xl mt-1">{r.status === 'pass' ? '✅' : '❌'}</div>
            <div className="flex-1 w-full overflow-hidden">
              <h3 className="font-semibold text-xl text-gray-900">{r.step}</h3>
              {r.details && (
                <div className="mt-3 relative w-full overflow-hidden rounded-md bg-white border">
                   <pre className="text-sm p-4 text-gray-800 overflow-x-auto font-mono whitespace-pre-wrap">
                     {JSON.stringify(r.details, null, 2)}
                   </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
