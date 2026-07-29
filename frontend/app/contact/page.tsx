"use client";

import { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
        const res = await fetch(`https://formsubmit.co/ajax/support@nodeferry.com`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: "New Support Message from NodeFerry",
                ...formData
            })
        });
        
        if (res.ok) {
            setStatus('success');
            setFormData({ name: '', email: '', message: '' });
        } else {
            setStatus('error');
        }
    } catch (e) {
        console.error(e);
        setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col gap-10">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-sm">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16L16 12L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Get in Touch</h1>
        <p className="text-slate-500 text-lg md:text-xl font-medium">Have a question, feedback, or need support? Drop us a line below.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col gap-6 w-full relative">
        {status === 'success' && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-[2rem] z-10 flex flex-col items-center justify-center gap-4 text-emerald-600 p-8 text-center border border-emerald-100">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h3 className="text-2xl font-bold text-slate-900">Message Sent!</h3>
                <p className="text-slate-600 font-medium">Thanks for reaching out. We will get back to you shortly at {formData.email || 'your email'}.</p>
                <button type="button" onClick={() => setStatus('idle')} className="mt-4 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all">Send Another</button>
            </div>
        )}
        
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
          <input type="text" id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium" placeholder="Jane Doe" />
        </div>
        
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
          <input type="email" id="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium" placeholder="jane@example.com" />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="message" className="text-sm font-bold text-slate-700 ml-1">Your Message</label>
          <textarea id="message" required rows={5} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-slate-900 font-medium" placeholder="How can we help you?"></textarea>
        </div>

        {status === 'error' && (
            <p className="text-red-500 text-sm font-bold text-center">Failed to send message. Please ensure the email server is configured.</p>
        )}

        <button disabled={status === 'loading'} type="submit" className="mt-4 w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-95 text-[15px] flex justify-center items-center gap-2">
          {status === 'loading' ? (
              <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Sending...</>
          ) : 'Send Message'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-slate-500 font-medium">Or email us directly at <a href="mailto:support@nodeferry.com" className="text-blue-600 font-bold hover:underline">support@nodeferry.com</a></p>
      </div>
    </div>
  );
}
