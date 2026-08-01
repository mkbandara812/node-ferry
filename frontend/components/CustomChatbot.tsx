"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, ChevronRight, User, Bot, HelpCircle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

type Message = {
    id: string;
    type: 'bot' | 'user';
    text: string;
    options?: { label: string; action: string }[];
};

export default function CustomChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            type: 'bot',
            text: 'Hi there! 👋 I am the NodeFerry Assistant. How can I help you today?',
            options: [
                { label: 'How to send files?', action: 'how_to_send' },
                { label: 'What is the file size limit?', action: 'size_limit' },
                { label: 'How do I buy credits?', action: 'buy_credits' },
                { label: 'Other / Contact Support', action: 'contact_support' }
            ]
        }
    ]);
    const [isContactMode, setIsContactMode] = useState(false);
    const [contactEmail, setContactEmail] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleOptionClick = (action: string, label: string) => {
        // Add user message
        const userMsg: Message = { id: Date.now().toString(), type: 'user', text: label };
        setMessages(prev => [...prev, userMsg]);

        // Simulate typing delay
        setTimeout(() => {
            let botReply: Message = { id: (Date.now() + 1).toString(), type: 'bot', text: '' };

            if (action === 'how_to_send') {
                botReply.text = 'You can send files via P2P (instant, unlimited size, requires both users online) or Cloud Link (generates a shareable link up to 500MB free). Just click the plus button on the home page!';
                botReply.options = [
                    { label: 'What is the file size limit?', action: 'size_limit' },
                    { label: 'Contact Support', action: 'contact_support' }
                ];
            } else if (action === 'size_limit') {
                botReply.text = 'P2P transfers have NO limits! Cloud uploads are limited to 500MB for free users, but you can buy credits for larger files!';
                botReply.options = [
                    { label: 'How do I buy credits?', action: 'buy_credits' },
                    { label: 'Contact Support', action: 'contact_support' }
                ];
            } else if (action === 'buy_credits') {
                botReply.text = 'Click the "Top Up Credits" button in your profile menu or visit the Pricing page to buy credits securely via PayPal.';
                botReply.options = [
                    { label: 'How to send files?', action: 'how_to_send' },
                    { label: 'Contact Support', action: 'contact_support' }
                ];
            } else if (action === 'contact_support') {
                botReply.text = 'No problem! Please fill out the form below, and our team will reply to your email within 24 hours.';
                setIsContactMode(true);
            }

            setMessages(prev => [...prev, botReply]);
        }, 600);
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactEmail || !contactMessage) return;

        setIsSending(true);
        
        try {
            const res = await fetch('/api/support/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: contactEmail, message: contactMessage })
            });

            if (res.ok) {
                setIsContactMode(false);
                setContactEmail('');
                setContactMessage('');
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'bot',
                    text: '✅ Your message has been sent successfully! We will get back to you at support@nodeferry.com soon.',
                    options: [{ label: 'Back to Start', action: 'reset' }]
                }]);
            } else {
                toast.error("Failed to send message. Please try again later.");
            }
        } catch (err) {
            toast.error("An error occurred.");
        } finally {
            setIsSending(false);
        }
    };

    const resetChat = () => {
        setMessages([{
            id: 'welcome',
            type: 'bot',
            text: 'Hi there! 👋 I am the NodeFerry Assistant. How can I help you today?',
            options: [
                { label: 'How to send files?', action: 'how_to_send' },
                { label: 'What is the file size limit?', action: 'size_limit' },
                { label: 'How do I buy credits?', action: 'buy_credits' },
                { label: 'Other / Contact Support', action: 'contact_support' }
            ]
        }]);
        setIsContactMode(false);
    };

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all z-50 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
            >
                <MessageSquare className="w-6 h-6" />
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none'}`}>
                
                {/* Header */}
                <div className="bg-blue-600 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg leading-tight">NodeFerry Support</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                <span className="text-blue-100 text-xs font-medium">Online</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-2 bg-blue-700/50 hover:bg-blue-700 rounded-full text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-end gap-2 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.type === 'user' ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                                    {msg.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`p-3 rounded-2xl text-sm ${msg.type === 'user' ? 'bg-slate-800 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none shadow-sm'}`}>
                                    {msg.text}
                                </div>
                            </div>
                            
                            {/* Options */}
                            {msg.options && (
                                <div className="mt-3 ml-10 flex flex-col gap-2 w-full pr-4">
                                    {msg.options.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (opt.action === 'reset') {
                                                    resetChat();
                                                } else {
                                                    handleOptionClick(opt.action, opt.label);
                                                }
                                            }}
                                            className="text-left w-fit max-w-full px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-sm font-semibold rounded-xl border border-blue-200 dark:border-blue-500/20 transition-colors flex items-center gap-2 group"
                                        >
                                            {opt.label}
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Contact Form */}
                    {isContactMode && (
                        <div className="ml-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <form onSubmit={handleContactSubmit} className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Your Email</label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                        placeholder="hello@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Message</label>
                                    <textarea 
                                        required 
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" 
                                        placeholder="How can we help you?"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        type="submit" 
                                        disabled={isSending}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                                    >
                                        {isSending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Send className="w-4 h-4" />}
                                        {isSending ? 'Sending...' : 'Send Message'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={resetChat}
                                        className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </>
    );
}
