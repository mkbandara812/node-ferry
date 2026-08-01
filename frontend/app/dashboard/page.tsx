"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Coins, Copy, Users, Clock, ArrowRight, Wallet, Zap, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [credits, setCredits] = useState<number>(0);
    const [referralCode, setReferralCode] = useState<string>('');
    const [totalReferred, setTotalReferred] = useState<number>(0);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                
                // Fetch credits & ref code
                const { data: userData } = await supabase
                    .from('users_credits')
                    .select('credits, referral_code')
                    .eq('user_id', session.user.id)
                    .single();
                
                if (userData) {
                    setCredits(userData.credits);
                    setReferralCode(userData.referral_code || '');
                }

                // Fetch total referred count
                const { count } = await supabase
                    .from('users_credits')
                    .select('user_id', { count: 'exact', head: true })
                    .eq('referred_by', session.user.id);
                setTotalReferred(count || 0);

                // Fetch payment history
                const { data: payments } = await supabase
                    .from('payment_history')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });
                
                if (payments) {
                    setPaymentHistory(payments);
                }
            }
            setIsLoading(false);
        };

        loadData();
    }, []);

    const copyReferralLink = () => {
        if (!referralCode) return;
        navigator.clipboard.writeText(`${window.location.origin}/?ref=${referralCode}`);
        toast.success("Referral link copied!");
    };

    if (isLoading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
                <ShieldCheck className="w-16 h-16 text-slate-300 mb-6" />
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Access Denied</h1>
                <p className="text-slate-500 mb-8 max-w-md">You need to log in to view your dashboard and payment history.</p>
                <Link href="/" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                    Go Home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020817] text-slate-900 dark:text-slate-100 flex flex-col pt-24 pb-20 px-4 sm:px-6 w-full relative">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-blue-400/10 dark:bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-5xl mx-auto w-full z-10 space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">{user.email}</p>
                    </div>
                    <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                        <Wallet className="w-4 h-4" />
                        Top Up Credits
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Balance Card */}
                    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Coins className="w-4 h-4" /> Current Balance
                        </h2>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{credits.toLocaleString()}</span>
                            <span className="text-slate-500 font-semibold">Credits</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Enough to store {Math.floor(credits / 10)} GB for 1 day.</p>
                        
                        <div className="flex items-center gap-4">
                            <Link href="/pricing" className="text-blue-600 dark:text-blue-400 font-bold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                                Get More Credits <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Referral Card */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 backdrop-blur-xl border border-emerald-200/60 dark:border-emerald-800/60 rounded-[2rem] p-8 shadow-xl shadow-emerald-200/20 dark:shadow-none relative overflow-hidden group">
                        <h2 className="text-sm font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Referral Program
                        </h2>
                        <div className="mb-6">
                            <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-50 mb-1">Earn 10 Free Credits</h3>
                            <p className="text-emerald-700/80 dark:text-emerald-300/80 font-medium text-sm">For every friend who signs up using your link, they get 5 credits!</p>
                        </div>

                        <div className="bg-white/60 dark:bg-slate-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl p-1 pl-4 flex items-center justify-between mb-3 shadow-inner">
                            <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200 truncate">{window.location.origin}/?ref={referralCode}</span>
                            <button onClick={copyReferralLink} className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors active:scale-95 shrink-0 ml-2" title="Copy Link">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="bg-white/60 dark:bg-slate-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl p-1 pl-4 flex items-center justify-between mb-4 shadow-inner">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider">Code:</span>
                                <span className="font-mono font-black text-emerald-800 dark:text-emerald-200 text-lg">{referralCode}</span>
                            </div>
                            <button onClick={() => {
                                navigator.clipboard.writeText(referralCode);
                                toast.success("Referral code copied!");
                            }} className="p-2.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400 rounded-lg shadow-sm transition-colors active:scale-95 shrink-0 ml-2" title="Copy Code">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg w-fit">
                            <Users className="w-4 h-4" />
                            {totalReferred} Friends Referred
                        </div>
                    </div>
                </div>

                {/* Payment History */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Payment History</h2>
                    </div>

                    {paymentHistory.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No Payments Yet</h3>
                            <p className="text-slate-500 font-medium text-sm">Top up your credits to see history here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800">
                                        <th className="pb-4 font-bold text-xs uppercase tracking-wider text-slate-400">Date & Time</th>
                                        <th className="pb-4 font-bold text-xs uppercase tracking-wider text-slate-400">Amount Paid</th>
                                        <th className="pb-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">Credits Received</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentHistory.map((payment) => (
                                        <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-4">
                                                <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                                                    {new Date(payment.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(payment.created_at).toLocaleTimeString()}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-sm">
                                                    ${Number(payment.amount_usd).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <div className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg text-sm">
                                                    <Zap className="w-3.5 h-3.5" />
                                                    +{payment.credits_bought.toLocaleString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
