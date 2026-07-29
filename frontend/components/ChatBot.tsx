"use client";

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mail, Bot } from 'lucide-react';

type Message = {
    role: 'user' | 'model';
    text: string;
};

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Hi! I am the NodeFerry AI Support Bot. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [email, setEmail] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, showEmailForm]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        const newMessages = [...messages, { role: 'user' as const, text: userText }];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);
        setShowEmailForm(false);

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            setTimeout(() => {
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    text: 'I am currently offline as my AI capabilities have not been configured yet. However, you can send an email directly to our human support team right from here!'
                }]);
                setShowEmailForm(true);
                setIsTyping(false);
            }, 1000);
            return;
        }

        try {
            // Build conversation history for Gemini API (must start with user)
            const apiMessages = newMessages[0].role === 'model' ? newMessages.slice(1) : newMessages;
            
            const contents = apiMessages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }));

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: "You are the NodeFerry AI Support Bot. NodeFerry is a free, secure, peer-to-peer file sharing web app. Key points: Files are transferred directly browser-to-browser via WebRTC, no servers store files, there are no file size limits (except 5GB/day quota for sender), transfers are fast and local network optimized. You must reply in Sinhala or English depending on user language. Keep answers very short, friendly, and helpful. If you cannot help, recommend sending an email." }]
                    },
                    contents: contents
                })
            });

            if (!response.ok) throw new Error("API Error");

            const data = await response.json();
            const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I didn't understand that.";
            
            setMessages(prev => [...prev, { role: 'model', text: botReply }]);
            
            // Heuristic to show email fallback if bot seems confused or says email
            if (botReply.toLowerCase().includes('email') || botReply.toLowerCase().includes('support team')) {
                setShowEmailForm(true);
            }
        } catch (error) {
            console.error("Gemini API Error:", error);
            setMessages(prev => [...prev, { 
                role: 'model', 
                text: 'Oops! I am having trouble connecting to my brain right now. You can send an email to support instead.' 
            }]);
            setShowEmailForm(true);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsTyping(true); // Re-use typing state for loading

        try {
            // Format chat history
            const historyText = messages.map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.text}`).join('\n\n');

            await fetch(`https://formsubmit.co/ajax/support@nodeferry.com`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    _subject: "Support Request from AI Chat Widget",
                    email: email,
                    message: "User sent a request via the AI Chat Widget. See chat history below:\n\n" + historyText
                })
            });

            setEmailSent(true);
            setTimeout(() => {
                setShowEmailForm(false);
                setEmailSent(false);
            }, 5000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white dark:bg-slate-900 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] rounded-3xl shadow-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {/* Header */}
                    <div className="bg-blue-600 text-white p-4 px-5 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[15px]">AI Support</h3>
                                <p className="text-blue-100 text-xs flex items-center gap-1.5 font-medium">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 px-5 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-2.5 text-[14px] shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-[18px] rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-[18px] rounded-bl-sm font-medium'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        
                        {isTyping && !showEmailForm && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 rounded-[18px] rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}

                        {showEmailForm && (
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm animate-in fade-in zoom-in duration-300">
                                {emailSent ? (
                                    <div className="text-emerald-600 dark:text-emerald-400 flex flex-col items-center text-center gap-2">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <p className="font-bold text-sm">Message Sent!</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Our team will get back to you soon.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendEmail} className="flex flex-col gap-4">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-blue-500" />
                                                Email Support
                                            </p>
                                            <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-snug">
                                                We'll send your chat history to our team so they can help you out.
                                            </p>
                                        </div>
                                        <input 
                                            type="email" 
                                            required 
                                            placeholder="Your email address" 
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                                        />
                                        <button disabled={isTyping} type="submit" className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-70 flex justify-center items-center active:scale-95">
                                            {isTyping ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Send to Support'}
                                        </button>
                                        <button type="button" onClick={() => setShowEmailForm(false)} className="text-[13px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold transition-colors">
                                            Nevermind
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 px-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        <form onSubmit={handleSend} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 pr-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                            <input 
                                type="text" 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Type your message..." 
                                className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 border-none px-4 py-2.5 text-[14px] outline-none font-medium"
                            />
                            <button 
                                type="submit" 
                                disabled={!input.trim() || isTyping}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-2.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)} 
                    className="w-[60px] h-[60px] bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_8px_30px_rgb(37,99,235,0.3)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-4 border-white dark:border-slate-900 group"
                >
                    <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
            )}
        </div>
    );
}
