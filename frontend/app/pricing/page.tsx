"use client";

import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Shield, Zap, DollarSign, Gift, Info, ChevronRight, HardDrive, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';
import { User } from '@supabase/supabase-js';

export default function PricingPage() {
    const [customGB, setCustomGB] = useState(5);
    const [retentionDays, setRetentionDays] = useState(3);
    const [user, setUser] = useState<User | null>(null);
    
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);
    
    const pricePerGBDay = 0.0055; 
    const paypalFixedFee = 0.30;
    
    const rawCost = customGB * retentionDays * pricePerGBDay;
    const totalCustomPrice = Number((rawCost + paypalFixedFee).toFixed(2));
    const creditsToReceive = customGB * retentionDays * 10;

    const handleApprove = async (data: any, actions: any, creditsToGive: number) => {
        if (!user) {
            alert("You must be logged in to receive credits!");
            return;
        }

        try {
            const res = await fetch('/api/payments/paypal/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderID: data.orderID,
                    creditsToGive,
                    userId: user.id
                })
            });

            if (res.ok) {
                alert(`Payment successful! You received ${creditsToGive} credits.`);
                window.location.reload();
            } else {
                alert("Payment verified, but failed to add credits. Please contact support.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020817] text-slate-900 dark:text-slate-100 flex flex-col pt-24 pb-20 px-4 sm:px-6 relative overflow-hidden font-sans transition-colors duration-300">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-6xl mx-auto w-full space-y-16 relative z-10">
                
                <div className="text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm mb-4">
                        <Zap className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        No Subscriptions, No Hidden Fees
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
                        Pay for what you <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">use.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                        Top up your credits to send files larger than 500MB via our ultra-fast Cloud Link. One simple currency, complete transparency.
                    </p>
                    
                    {!user && (
                        <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-5 py-3 rounded-2xl font-bold text-sm mt-4 shadow-sm">
                            <Info className="w-5 h-5 shrink-0" />
                            Please log in using the button at the top before purchasing credits.
                        </div>
                    )}
                </div>

                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Custom Top-Up */}
                    <div className="lg:col-span-7 bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-xl dark:shadow-2xl">
                        
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                    Custom Top-Up
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Calculate exactly how many credits you need.</p>
                            </div>
                            <div className="hidden sm:flex w-14 h-14 bg-blue-50 dark:bg-blue-500/10 rounded-2xl items-center justify-center border border-blue-100 dark:border-blue-500/20">
                                <Zap className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        
                        <div className="space-y-10">
                            
                            {/* Sliders */}
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <HardDrive className="w-4 h-4" /> File Size
                                        </label>
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">{customGB} GB</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" max="50" step="1"
                                        value={customGB}
                                        onChange={(e) => setCustomGB(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                                    />
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Storage Time
                                        </label>
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">{retentionDays} Days</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" max="14" step="1"
                                        value={retentionDays}
                                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Receipt */}
                            <div className="bg-slate-50/80 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 space-y-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
                                
                                <div className="flex justify-between text-base font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Base Cost & Margin</span>
                                    <span>${rawCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-base font-semibold text-slate-600 dark:text-slate-400">
                                    <span>PayPal Fixed Fee</span>
                                    <span>${paypalFixedFee.toFixed(2)}</span>
                                </div>
                                
                                <div className="h-px w-full bg-slate-200 dark:bg-slate-800/80 my-4"></div>
                                
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Payment</span>
                                        <span className="text-4xl font-black text-slate-900 dark:text-white">${totalCustomPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">You Receive</span>
                                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{creditsToReceive} Credits</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`transition-opacity duration-300 ${!user ? "opacity-50 pointer-events-none grayscale" : ""}`}>
                                <PayPalScriptProvider options={{ "clientId": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", currency: "USD" }}>
                                    <PayPalButtons 
                                        style={{ layout: "vertical", color: "blue", shape: "rect", height: 50 }}
                                        createOrder={(data, actions) => {
                                            return actions.order.create({
                                                intent: "CAPTURE",
                                                purchase_units: [{
                                                    amount: { value: totalCustomPrice.toString(), currency_code: "USD" },
                                                    description: `${creditsToReceive} Credits for NodeFerry`
                                                }]
                                            });
                                        }}
                                        onApprove={(data, actions) => handleApprove(data, actions, creditsToReceive)}
                                    />
                                </PayPalScriptProvider>
                            </div>
                        </div>
                    </div>

                    {/* Value Packs */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        
                        <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/30 dark:to-purple-900/20 backdrop-blur-xl border border-indigo-200/60 dark:border-indigo-500/20 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden shadow-xl dark:shadow-2xl group">
                            <div className="absolute top-0 right-0 bg-indigo-600 dark:bg-indigo-500 text-white px-5 py-1.5 rounded-bl-2xl font-bold text-sm tracking-wide shadow-md">
                                RECOMMENDED
                            </div>
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-purple-400 dark:from-indigo-500 dark:to-purple-500 rounded-[2.5rem] blur opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition duration-1000 group-hover:duration-200 pointer-events-none"></div>
                            
                            <div className="relative">
                                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Starter Pack</h3>
                                <p className="text-indigo-700/80 dark:text-indigo-200/70 font-medium mb-8">Perfect for occasional large transfers.</p>
                                
                                <div className="flex items-baseline gap-2 mb-8">
                                    <span className="text-5xl font-black text-slate-900 dark:text-white">$2.00</span>
                                </div>
                                
                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-semibold">
                                        <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        <span><strong className="text-slate-900 dark:text-white">2,000</strong> Credits</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-semibold">
                                        <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        <span>Equal to <strong className="text-slate-900 dark:text-white">200 GB-Days</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-semibold">
                                        <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        <span>Credits never expire</span>
                                    </div>
                                </div>

                                <div className={`mt-auto ${!user ? "opacity-50 pointer-events-none grayscale" : ""}`}>
                                    <PayPalScriptProvider options={{ "clientId": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", currency: "USD" }}>
                                        <PayPalButtons 
                                            style={{ layout: "vertical", color: "gold", shape: "rect", height: 45 }}
                                            createOrder={(data, actions) => {
                                                return actions.order.create({
                                                    intent: "CAPTURE",
                                                    purchase_units: [{
                                                        amount: { value: "2.00", currency_code: "USD" },
                                                        description: `2000 Credits for NodeFerry`
                                                    }]
                                                });
                                            }}
                                            onApprove={(data, actions) => handleApprove(data, actions, 2000)}
                                        />
                                    </PayPalScriptProvider>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-[2.5rem] p-8 relative overflow-hidden shadow-lg dark:shadow-none">
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">Pro Pack</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mb-6 text-sm">Save 15% on transaction fees.</p>
                            
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-3xl font-black text-slate-900 dark:text-white">$5.00</span>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 text-sm font-semibold">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                                    <span><strong className="text-slate-900 dark:text-white">6,000</strong> Credits (600 GB-Days)</span>
                                </div>
                            </div>

                            <div className={`${!user ? "opacity-50 pointer-events-none grayscale" : ""}`}>
                                <PayPalScriptProvider options={{ "clientId": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", currency: "USD" }}>
                                    <PayPalButtons 
                                        style={{ layout: "vertical", color: "gold", shape: "rect", height: 40 }}
                                        createOrder={(data, actions) => {
                                            return actions.order.create({
                                                intent: "CAPTURE",
                                                purchase_units: [{
                                                    amount: { value: "5.00", currency_code: "USD" },
                                                    description: `6000 Credits for NodeFerry`
                                                }]
                                            });
                                        }}
                                        onApprove={(data, actions) => handleApprove(data, actions, 6000)}
                                    />
                                </PayPalScriptProvider>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
