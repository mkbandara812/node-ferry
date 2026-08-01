'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Settings, Save, AlertCircle, Building2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function SettingsPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [brandName, setBrandName] = useState('');
    const [brandLogoUrl, setBrandLogoUrl] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setIsLoading(false);
                return;
            }
            
            setUserId(session.user.id);
            
            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
                
            if (data) {
                setBrandName(data.brand_name || '');
                setBrandLogoUrl(data.brand_logo_url || '');
            }
            
            setIsLoading(false);
        };
        
        fetchSettings();
    }, []);

    const saveSettings = async () => {
        if (!userId) return;
        setIsSaving(true);
        setError('');
        setSuccess('');
        
        try {
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    brand_name: brandName,
                    brand_logo_url: brandLogoUrl,
                    updated_at: new Date().toISOString()
                });
                
            if (error) throw error;
            
            setSuccess('Settings saved successfully!');
        } catch (err: any) {
            setError(err.message || 'Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="min-h-[60vh] flex items-center justify-center font-bold text-slate-500">Loading settings...</div>;
    }

    if (!userId) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Login Required</h1>
                <p className="text-slate-500 max-w-md">You need to log in to access Pro settings and configure custom branding.</p>
                <Link href="/" className="mt-8 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold">Go to Homepage</Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-6 md:p-12 font-sans min-h-[calc(100vh-160px)] pt-20">
            <div className="flex items-center gap-3 mb-8 w-full">
                <Settings className="w-8 h-8 text-purple-600" />
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Premium Settings
                </h1>
            </div>

            <div className="w-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-500"/> Custom Branding</h2>
                    <p className="text-sm text-slate-500 font-medium">Replace the NodeFerry branding on the download page with your own company name and logo.</p>
                </div>

                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Brand Name</label>
                        <input 
                            type="text" 
                            value={brandName}
                            onChange={e => setBrandName(e.target.value)}
                            placeholder="e.g. Acme Corporation" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-slate-400" /> Logo Image URL
                        </label>
                        <input 
                            type="url" 
                            value={brandLogoUrl}
                            onChange={e => setBrandLogoUrl(e.target.value)}
                            placeholder="https://example.com/logo.png" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <p className="text-xs text-slate-500 font-medium ml-1">Must be a public URL to a transparent PNG or SVG image.</p>
                    </div>

                    {error && <p className="text-sm font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                    {success && <p className="text-sm font-bold text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">{success}</p>}

                    <button 
                        onClick={saveSettings}
                        disabled={isSaving}
                        className="mt-4 flex items-center justify-center gap-2 w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl font-bold shadow-sm transition-all text-[15px]"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
