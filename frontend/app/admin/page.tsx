'use client';
import { useState } from 'react';
import { ShieldCheck, CheckCircle } from 'lucide-react';

export default function AdminPage() {
  const [key, setKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = async (secret: string) => {
    try {
      const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:8080';
      const apiUrl = signalingUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      const res = await fetch(`${apiUrl}/admin/requests?key=${secret}`);
      if (res.ok) {
        setAuthenticated(true);
        const data = await res.json();
        setRequests(data);
      } else {
        alert("Invalid Key");
      }
    } catch (e) {
      alert("Network Error");
    }
  };

  const approveRequest = async (ip: string) => {
    try {
      const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:8080';
      const apiUrl = signalingUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      const res = await fetch(`${apiUrl}/admin/approve?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      if (res.ok) {
        setRequests(requests.filter(r => r.ip !== ip));
      }
    } catch (e) {
      alert("Failed to approve");
    }
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-12 w-full max-w-md mx-auto mt-20 bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200">
        <ShieldCheck className="w-12 h-12 text-blue-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Login</h1>
        <input 
          type="password" 
          value={key} 
          onChange={e => setKey(e.target.value)} 
          placeholder="Enter Secret Key"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-center font-bold tracking-widest text-slate-900"
          onKeyDown={e => e.key === 'Enter' && fetchRequests(key)}
        />
        <button onClick={() => fetchRequests(key)} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-md">Login Securely</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-8 mt-12 bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-slate-200">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
          Pending Quota Requests
        </h1>
        <button onClick={() => fetchRequests(key)} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-lg">Refresh List</button>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 opacity-60">
            <CheckCircle className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold text-lg">No pending requests right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((r, idx) => (
            <div key={idx} className="p-6 border border-slate-200 bg-slate-50 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-sm font-bold text-slate-800 bg-white px-3 py-1 border border-slate-200 shadow-sm rounded-lg">{r.ip}</span>
                  <span className="text-xs font-bold text-slate-400">{new Date(r.date).toLocaleString()}</span>
                </div>
                <p className="text-slate-700 font-medium text-[15px] mb-4 bg-white p-3 rounded-xl border border-slate-100">"{r.reason}"</p>
                
                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  <span className="bg-blue-100 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-md">Requested: {r.amount}</span>
                  <span className={`px-2.5 py-1 rounded-md border ${r.donatedBefore === 'Yes' ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    Donated Before: {r.donatedBefore}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md border ${r.planToDonate.includes('Yes') ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    Plan to Donate: {r.planToDonate}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => approveRequest(r.ip)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
              >
                <CheckCircle className="w-5 h-5" />
                Approve IP
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
