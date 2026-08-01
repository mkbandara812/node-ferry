'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Coffee, Menu, X, User as UserIcon, Coins, Zap, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import LoginModal from './LoginModal';
import { supabase } from '@/utils/supabaseClient';
import { User } from '@supabase/supabase-js';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string>('');

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchCredits(session.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchCredits(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase.from('users_credits').select('credits, referral_code').eq('user_id', userId).single();
    if (data) {
        setCredits(Number(data.credits));
        if (data.referral_code) setReferralCode(data.referral_code);
    } else {
        // Init if not exists
        const refCode = localStorage.getItem('nodeferry_ref_code');
        const res = await fetch('/api/user/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, referredByCode: refCode })
        });
        if (res.ok) {
            const result = await res.json();
            if (result.referralCode) setReferralCode(result.referralCode);
            // Fetch again
            const { data: newData } = await supabase.from('users_credits').select('credits').eq('user_id', userId).single();
            if (newData) setCredits(Number(newData.credits));
        }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
    <header className="w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-40 transition-all">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group z-50">
          <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 20L19 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 20L5 11C5 8.23858 7.23858 6 10 6L14 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M19 4L19 13C19 15.7614 16.7614 18 14 18L10 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="5" cy="20" r="2.5" fill="currentColor"/>
              <circle cx="19" cy="4" r="2.5" fill="currentColor"/>
            </svg>
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">NodeFerry</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
          <Link href="/pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Pricing</Link>
          <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">How it Works</Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          
          {user ? (
            <div className="relative group cursor-pointer">
                {/* Premium Animated Border Ring */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                
                {/* Profile Pill */}
                <div className="relative flex items-center gap-3 bg-white dark:bg-slate-950 px-2 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
                    
                    {/* Avatar Circle */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                        {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="flex flex-col pr-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Balance</span>
                        <div className="flex items-center gap-1 text-sm font-extrabold text-slate-800 dark:text-white leading-none">
                            <Coins className="w-3.5 h-3.5 text-blue-500" />
                            <span>{credits.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 overflow-hidden z-50">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                        <p className="text-xs text-slate-500 font-medium truncate">{user.email}</p>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                        <Link href="/pricing" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <Zap className="w-4 h-4 text-purple-500" />
                            Top Up Credits
                        </Link>
                        {referralCode && (
                            <button onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/?ref=${referralCode}`);
                                alert('Referral link copied! Share with friends to get 50 credits each.');
                            }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors w-full text-left">
                                <Coins className="w-4 h-4" />
                                Copy Referral Link
                            </button>
                        )}
                        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full text-left">
                            <LogOut className="w-4 h-4" />
                            Log out
                        </button>
                    </div>
                </div>
            </div>
          ) : (
            <button 
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 border border-transparent hover:border-slate-700 dark:hover:border-slate-200"
            >
                <UserIcon className="w-4 h-4" />
                Login
            </button>
          )}
        </div>

        {/* Mobile Toggle & Theme */}
        <div className="flex md:hidden items-center gap-2 z-50">
          <ThemeToggle />
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-xl py-4 px-6 flex flex-col gap-4 animate-in slide-in-from-top-2 z-40">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors py-2">Home</Link>
          <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors py-2">Pricing</Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors py-2">How it Works</Link>
          <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
          
          {user ? (
            <div className="flex flex-col gap-3">
                <div className="text-sm text-slate-500 dark:text-slate-400">Logged in as {user.email}</div>
                <div className="font-bold text-blue-600 dark:text-blue-400">Credits: {credits}</div>
                <button onClick={handleLogout} className="text-left font-semibold text-red-500 py-2">Log out</button>
            </div>
          ) : (
            <button 
                onClick={() => { setMobileMenuOpen(false); setLoginModalOpen(true); }}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-base transition-all bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            >
                Login / Sign Up
            </button>
          )}
        </div>
      )}
    </header>
    
    <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
        onSuccess={() => {
            // Re-fetch credits on successful login
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) fetchCredits(session.user.id);
            });
        }}
    />
    </>
  );
}
