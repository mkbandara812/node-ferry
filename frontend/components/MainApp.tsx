'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UploadCloud, CheckCircle, File as FileIcon, Lock, ShieldAlert, ShieldCheck, Send, LogOut, Coffee } from 'lucide-react';
import { get, set } from 'idb-keyval';
import confetti from 'canvas-confetti';

export default function MainApp({ initialRoomId }: { initialRoomId?: string } = {}) {
  const [roomId, setRoomId] = useState<string>(initialRoomId || '');
  const [connected, setConnected] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [receivingFile, setReceivingFile] = useState<{name: string, size: number} | null>(null);

  // Password Feature State
  const [roomPassword, setRoomPassword] = useState<string>('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
  const [showDonationPopup, setShowDonationPopup] = useState<boolean>(false);
  const [showQuotaModal, setShowQuotaModal] = useState<boolean>(false);
  const [quotaForm, setQuotaForm] = useState({ reason: '', amount: '10GB', donatedBefore: 'No', planToDonate: 'Yes' });
  const [quotaSubmitStatus, setQuotaSubmitStatus] = useState<string>('');

  const [joinPassword, setJoinPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [limitError, setLimitError] = useState<string>('');
  const [fileWarning, setFileWarning] = useState<string>('');

  // Sounds
  const playSound = (type: 'success' | 'chat') => {
    try {
      const src = type === 'success' 
        ? 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3' 
        : 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';
      const audio = new Audio(src);
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio playback prevented'));
    } catch(e){}
  };

  // Analytics & Security State
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const [transferSpeed, setTransferSpeed] = useState<string>('');
  const [eta, setEta] = useState<string>('');
  const [isSecureE2EE, setIsSecureE2EE] = useState<boolean>(false);
  
  // Chat State
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [baseUrl, setBaseUrl] = useState<string>('https://nodeferry.com');
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const receiveBufferRef = useRef<ArrayBuffer[]>([]);
  const receivedSizeRef = useRef<number>(0);
  const incomingFileMetaRef = useRef<{name: string, size: number} | null>(null);

  // E2EE State
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const isIncomingEncryptedRef = useRef<boolean>(false);

  const lastChunkTimeRef = useRef<number>(0);
  const lastChunkSizeRef = useRef<number>(0);
  const resumeOffsetRef = useRef<number>(0);

  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.error('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current !== null) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const resetRoom = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    releaseWakeLock();

    setRoomId('');
    setConnected(false);
    setFiles([]);
    set('nodeferry_files', []).catch(console.error);
    setCurrentFileIndex(0);
    setAuthError('');
    setLimitError('');
    setMessages([]);
    setTransferProgress(0);
    setTransferSpeed('');
    setEta('');
    setIsSecureE2EE(false);
    setShowPasswordPrompt(false);
    setRoomPassword('');
    
    window.history.pushState({}, '', window.location.pathname);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
      
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room') || initialRoomId;
      if (roomParam && !connected && !roomId) {
        joinRoom(roomParam);
      }
      
      // Load cached files
      get('nodeferry_files').then((cachedFiles) => {
        if (cachedFiles && Array.isArray(cachedFiles) && cachedFiles.length > 0) {
          setFiles(cachedFiles);
        }
      }).catch(console.error);
    }
  }, [initialRoomId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (transferProgress > 0 && transferProgress < 100) {
        e.preventDefault();
        e.returnValue = ''; // Standard required for most browsers to show a prompt
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [transferProgress]);

  const initWebRTC = (isInit: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setAuthError('Connection lost. The peer may have disconnected.');
          setConnected(false);
          setIsSecureE2EE(false);
          releaseWakeLock();
      }
    };

    pc.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      receiveChannel.binaryType = 'arraybuffer';
      receiveChannel.onmessage = handleReceiveMessage;
      receiveChannel.onopen = () => {
          setConnected(true);
          setShowPasswordPrompt(false);
          requestWakeLock();
      };
      dataChannelRef.current = receiveChannel;
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const calculateAnalytics = (currentSize: number, totalSize: number) => {
    const now = Date.now();
    if (lastChunkTimeRef.current === 0) {
      lastChunkTimeRef.current = now;
      lastChunkSizeRef.current = currentSize;
      return;
    }

    const timeDiff = (now - lastChunkTimeRef.current) / 1000;
    if (timeDiff >= 1) {
      const bytesInDiff = currentSize - lastChunkSizeRef.current;
      const speedMBps = (bytesInDiff / (1024 * 1024)) / timeDiff;
      setTransferSpeed(`${speedMBps.toFixed(2)} MB/s`);

      const remainingBytes = totalSize - currentSize;
      const remainingSeconds = remainingBytes / (bytesInDiff / timeDiff);
      
      if (remainingSeconds < 60) {
        setEta(`${Math.round(remainingSeconds)}s remaining`);
      } else {
        setEta(`${Math.floor(remainingSeconds / 60)}m ${Math.round(remainingSeconds % 60)}s remaining`);
      }

      lastChunkTimeRef.current = now;
      lastChunkSizeRef.current = currentSize;
    }
  };

  const handleReceiveMessage = async (event: MessageEvent) => {
    if (typeof event.data === 'string') {
      const message = JSON.parse(event.data);
      
      if (message.type === 'e2e_key') {
          const rawKey = new Uint8Array(message.key);
          encryptionKeyRef.current = await crypto.subtle.importKey(
              "raw",
              rawKey,
              { name: "AES-GCM" },
              true,
              ["encrypt", "decrypt"]
          );
      } else if (message.type === 'resume_request') {
        resumeOffsetRef.current = message.offset;
      } else if (message.type === 'meta') {
        if (
          incomingFileMetaRef.current &&
          incomingFileMetaRef.current.name === message.name &&
          incomingFileMetaRef.current.size === message.size &&
          receivedSizeRef.current > 0
        ) {
          // Resume existing transfer
          dataChannelRef.current?.send(JSON.stringify({ type: 'resume_request', offset: receivedSizeRef.current }));
        } else {
          incomingFileMetaRef.current = { name: message.name, size: message.size };
          setReceivingFile({ name: message.name, size: message.size });
          isIncomingEncryptedRef.current = !!message.encrypted;
          setIsSecureE2EE(!!message.encrypted);
          receiveBufferRef.current = [];
          receivedSizeRef.current = 0;
          lastChunkTimeRef.current = 0;
          setTransferProgress(0);
          setTransferSpeed('');
          setEta('');
        }
      } else if (message.type === 'end') {
        const blob = new Blob(receiveBufferRef.current);
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = incomingFileMetaRef.current?.name || 'downloaded_file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setTransferProgress(100);
        setTransferSpeed('Complete');
        setEta('');
        
        setTimeout(() => {
            setTransferProgress(0);
            setTransferSpeed('');
            setIsSecureE2EE(false);
            setReceivingFile(null);
            playSound('success');
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            setShowDonationPopup(true);
        }, 1500);

      } else if (message.type === 'chat') {
        playSound('chat');
        setMessages(prev => [...prev, { sender: 'Peer', text: message.text }]);
      }
    } else {
      let chunkData: ArrayBuffer = event.data;
      
      if (isIncomingEncryptedRef.current && encryptionKeyRef.current) {
          try {
              const payload = new Uint8Array(event.data as ArrayBuffer);
              const iv = payload.slice(0, 12);
              const ciphertext = payload.slice(12);
              chunkData = await crypto.subtle.decrypt(
                  { name: "AES-GCM", iv: iv },
                  encryptionKeyRef.current,
                  ciphertext
              );
          } catch (e) {
              console.error("Decryption failed", e);
              setAuthError("Failed to decrypt incoming chunk.");
              return;
          }
      }

      receiveBufferRef.current.push(chunkData);
      receivedSizeRef.current += chunkData.byteLength;
      
      if (incomingFileMetaRef.current) {
        const progress = Math.min(100, Math.round((receivedSizeRef.current / incomingFileMetaRef.current.size) * 100));
        setTransferProgress(progress);
        calculateAnalytics(receivedSizeRef.current, incomingFileMetaRef.current.size);
      }
    }
  };

  const proceedToOffer = async (pc: RTCPeerConnection, ws: WebSocket) => {
    const dataChannel = pc.createDataChannel('fileTransfer');
    dataChannel.binaryType = 'arraybuffer';
    dataChannel.onopen = () => {
        setConnected(true);
        requestWakeLock();
    };
    dataChannel.onmessage = handleReceiveMessage;
    dataChannelRef.current = dataChannel;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', offer }));
  };

  const connectSignalingServer = async (id: string, isInitiator: boolean) => {
    const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:8080';
    const ws = new WebSocket(`${signalingUrl}/room/${id}`);
    wsRef.current = ws;

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      const pc = peerConnectionRef.current;
      if (!pc || (pc.connectionState !== 'connected' && pc.iceConnectionState !== 'connected')) {
        setAuthError('Signaling Server is offline. Please make sure the backend is running.');
      }
    };

    ws.onclose = (event) => {
      const pc = peerConnectionRef.current;
      const isPeerConnected = pc && (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected');
      
      if (!event.wasClean && !isPeerConnected) {
        // Mobile browsers often kill WebSockets when opening the file picker.
        // Try to reconnect silently instead of showing an error immediately.
        setTimeout(() => {
            if (!peerConnectionRef.current || peerConnectionRef.current.connectionState !== 'connected') {
                connectSignalingServer(id, isInitiator);
            }
        }, 3000);
      }
    };

    ws.onopen = async () => {
      setAuthError('');
      initWebRTC(isInitiator);
      if (!isInitiator) {
        ws.send(JSON.stringify({ type: 'join' }));
      }
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (message.type === 'limit_exceeded') {
          setLimitError(message.message || 'Daily transfer limit reached.');
      } else if (message.type === 'join' && isInitiator) {
        if (roomPassword) {
            ws.send(JSON.stringify({ type: 'auth_required' }));
        } else {
            proceedToOffer(pc, ws);
        }
      } else if (message.type === 'auth_required' && !isInitiator) {
          setShowPasswordPrompt(true);
      } else if (message.type === 'auth' && isInitiator) {
          if (message.password === roomPassword) {
              proceedToOffer(pc, ws);
          } else {
              ws.send(JSON.stringify({ type: 'auth_failed' }));
          }
      } else if (message.type === 'auth_failed' && !isInitiator) {
          setAuthError('Incorrect password. Please try again.');
      } else if (message.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', answer }));
      } else if (message.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
      } else if (message.type === 'candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    };
  };

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(7);
    setRoomId(newRoomId);
    window.history.pushState({}, '', `?room=${newRoomId}`);
    connectSignalingServer(newRoomId, true);
  };

  const joinRoom = (id: string) => {
    setRoomId(id);
    connectSignalingServer(id, false);
  };

  const handleJoinSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inputRoom = formData.get('roomInput') as string;
    if (inputRoom) {
      window.history.pushState({}, '', `?room=${inputRoom}`);
      joinRoom(inputRoom);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const updatedFiles = [...files, ...Array.from(e.dataTransfer.files!)];
      if (updatedFiles.length > 1) {
          setFileWarning("Notice: Sending multiple files will trigger multiple download prompts for the receiver. We recommend putting them in a .zip folder first if possible.");
      } else {
          setFileWarning('');
      }
      setFiles(updatedFiles);
      set('nodeferry_files', updatedFiles).catch(console.error);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const updatedFiles = [...files, ...Array.from(e.target.files!)];
      if (updatedFiles.length > 1) {
          setFileWarning("Notice: Sending multiple files will trigger multiple download prompts for the receiver. We recommend putting them in a .zip folder first if possible.");
      } else {
          setFileWarning('');
      }
      setFiles(updatedFiles);
      set('nodeferry_files', updatedFiles).catch(console.error);
    }
  };

  const sendSingleFile = (file: File, startOffset: number = 0) => {
      return new Promise<void>(async (resolve, reject) => {
          if (limitError) return reject(new Error('Limit exceeded'));
          
          const CHUNK_SIZE = 16 * 1024;
          const buffer = await file.arrayBuffer();
          let offset = startOffset;
          lastChunkTimeRef.current = 0;

          // Send metadata through WebSocket signaling server first to check quota
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
             wsRef.current.send(JSON.stringify({
                 type: 'meta',
                 name: file.name,
                 size: file.size
             }));
          }

          // Wait a brief moment to see if signaling server rejects it due to quota
          await new Promise(r => setTimeout(r, 500));
          
          if (limitError) {
             return reject(new Error('Limit exceeded'));
          }

          let key: CryptoKey | null = null;
          key = await crypto.subtle.generateKey(
              { name: "AES-GCM", length: 256 },
              true,
              ["encrypt", "decrypt"]
          );
          const exported = await crypto.subtle.exportKey("raw", key);
          dataChannelRef.current!.send(JSON.stringify({ 
              type: 'e2e_key', 
              key: Array.from(new Uint8Array(exported)) 
          }));
          setIsSecureE2EE(true);

          resumeOffsetRef.current = 0;
          if (startOffset === 0) {
            dataChannelRef.current!.send(JSON.stringify({ 
                type: 'meta', 
                name: file.name, 
                size: file.size,
                encrypted: true
            }));
          }
          
          // Wait to see if receiver requests a resume offset
          await new Promise(r => setTimeout(r, 1000));
          
          if (resumeOffsetRef.current > 0) {
              offset = resumeOffsetRef.current;
              console.log(`Resuming file transfer from offset: ${offset}`);
          }

          const sendChunk = async () => {
              if (limitError) {
                  return reject(new Error('Limit exceeded during transfer'));
              }
              while (offset < buffer.byteLength) {
                  if (dataChannelRef.current!.bufferedAmount > 65535) {
                      setTimeout(sendChunk, 10);
                      return;
                  }
                  
                  const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
                  let dataToSend: ArrayBuffer = chunk;

                  if (key) {
                      const iv = crypto.getRandomValues(new Uint8Array(12));
                      const encrypted = await crypto.subtle.encrypt(
                          { name: "AES-GCM", iv: iv },
                          key,
                          chunk
                      );
                      const payload = new Uint8Array(iv.length + encrypted.byteLength);
                      payload.set(iv, 0);
                      payload.set(new Uint8Array(encrypted), iv.length);
                      dataToSend = payload.buffer;
                  }
                  
                  dataChannelRef.current!.send(dataToSend);
                  offset += CHUNK_SIZE;
                  
                  setTransferProgress(Math.min(100, Math.round((offset / buffer.byteLength) * 100)));
                  calculateAnalytics(offset, buffer.byteLength);
              }

              if (offset >= buffer.byteLength) {
                  dataChannelRef.current!.send(JSON.stringify({ type: 'end' }));
                  setTransferSpeed('Complete');
                  setEta('');
                  
                  setTimeout(() => {
                      setIsSecureE2EE(false);
                      resolve();
                  }, 500); 
              }
          };
          sendChunk();
      });
  };

  const sendAllFiles = async () => {
    if (files.length === 0 || !dataChannelRef.current || dataChannelRef.current.readyState !== 'open') return;

    for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i);
        try {
            await sendSingleFile(files[i]);
        } catch (e) {
            console.error(e);
            break;
        }
    }

    setTimeout(() => {
        setTransferProgress(0);
        setFiles([]);
        set('nodeferry_files', []).catch(console.error);
        setCurrentFileIndex(0);
        setTransferSpeed('');
        playSound('success');
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setShowDonationPopup(true);
    }, 2000);
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !dataChannelRef.current) return;
    
    dataChannelRef.current.send(JSON.stringify({ type: 'chat', text: chatInput }));
    setMessages(prev => [...prev, { sender: 'You', text: chatInput }]);
    setChatInput('');
  };

  const sendPasswordAuth = () => {
      wsRef.current?.send(JSON.stringify({ type: 'auth', password: joinPassword }));
  };

  const submitQuotaRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuotaSubmitStatus('Submitting...');
    try {
      const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:8080';
      const apiUrl = signalingUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      
      const response = await fetch(`${apiUrl}/request-quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotaForm)
      });
      
      if (response.ok) {
        setQuotaSubmitStatus('Request submitted successfully!');
        setTimeout(() => {
          setShowQuotaModal(false);
          setQuotaSubmitStatus('');
        }, 2000);
      } else {
        setQuotaSubmitStatus('Failed to submit. Please try again.');
      }
    } catch (error) {
      setQuotaSubmitStatus('Network error. Is the server running?');
    }
  };

  return (
    <div className="flex flex-col xl:flex-row w-full max-w-[1200px] mx-auto items-center xl:items-start justify-center p-6 md:p-12 font-sans gap-12 xl:gap-20 min-h-[calc(100vh-160px)]">
      
      {showDonationPopup && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl w-full max-w-md flex flex-col items-center gap-4 shadow-2xl text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-800 relative">
            <button onClick={() => setShowDonationPopup(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <div className="text-5xl mt-2">🎉</div>
            <h2 className="text-2xl font-extrabold text-center tracking-tight text-slate-900 mt-2">Transfer Complete!</h2>
            <p className="text-slate-500 text-[15px] text-center px-2 leading-relaxed font-medium">
              Your file was transferred securely and for free, with zero server storage. 
              <br/><br/>
              If NodeFerry saved your day, please consider supporting us so we can keep this service 100% free for everyone!
            </p>
            
            <a href="https://ko-fi.com/nodeferry" target="_blank" rel="noopener noreferrer" className="mt-4 w-full flex items-center justify-center gap-3 py-3.5 bg-[#FF5E5B] hover:bg-[#FF4A47] text-white rounded-xl font-bold transition-all shadow-sm active:scale-95 text-[15px]">
                <Coffee className="w-5 h-5" />
                Support on Ko-fi
            </a>
          </div>
        </div>
      )}

      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm flex flex-col gap-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] text-slate-900 border border-slate-200/60">
            <div className="flex items-center justify-center text-blue-600 mb-2 bg-blue-50 w-16 h-16 rounded-2xl mx-auto">
                <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-center tracking-tight">Protected Room</h2>
            <p className="text-slate-500 text-sm text-center">This room requires a password to connect.</p>
            <input 
              type="password"
              value={joinPassword}
              onChange={e => { setJoinPassword(e.target.value); setAuthError(''); }}
              placeholder="Enter Password" 
              className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center mt-2 font-medium"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') sendPasswordAuth(); }}
            />
            {authError && <p className="text-red-500 text-xs text-center font-bold">{authError}</p>}
            <button 
              onClick={sendPasswordAuth}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-500/20 active:scale-95"
            >
              Connect Securely
            </button>
          </div>
        </div>
      )}

      {showQuotaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md flex flex-col gap-4 shadow-2xl text-slate-900 border border-slate-200/60 relative">
            <button onClick={() => setShowQuotaModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Request Quota Increase</h2>
            <p className="text-slate-500 text-sm font-medium">As a free service, we limit daily usage to ensure server stability. Let us know why you need more!</p>
            
            <form onSubmit={submitQuotaRequest} className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Why do you need more?</label>
                    <textarea required value={quotaForm.reason} onChange={e => setQuotaForm({...quotaForm, reason: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[80px]" placeholder="e.g. Transferring a video project to a client..."></textarea>
                </div>
                
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">How much per day?</label>
                    <select value={quotaForm.amount} onChange={e => setQuotaForm({...quotaForm, amount: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                        <option value="10GB">10GB</option>
                        <option value="25GB">25GB</option>
                        <option value="50GB">50GB</option>
                        <option value="Unlimited">Unlimited (Requires Admin Approval)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Have you donated before?</label>
                    <select value={quotaForm.donatedBefore} onChange={e => setQuotaForm({...quotaForm, donatedBefore: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Do you plan to donate?</label>
                    <select value={quotaForm.planToDonate} onChange={e => setQuotaForm({...quotaForm, planToDonate: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                        <option value="Yes">Yes, I plan to support soon</option>
                        <option value="No">No, I just need it for free</option>
                    </select>
                </div>

                <button type="submit" className="mt-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm active:scale-95">
                    Submit Request
                </button>
                {quotaSubmitStatus && <p className="text-center text-sm font-bold text-blue-600 mt-1">{quotaSubmitStatus}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Left Column: Text / Chat (Moved to Left for better hierarchy) */}
      <div className="flex-1 w-full max-w-lg flex flex-col justify-center xl:mt-12 order-2 xl:order-1">
        {!connected ? (
          <div className="text-center xl:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-slate-900 dark:text-white tracking-tight leading-[1.1]">
              Share files <br className="hidden xl:block" /><span className="text-blue-600 dark:text-blue-500">securely</span>, for free.
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl font-medium mb-8 max-w-md mx-auto xl:mx-0 leading-relaxed">
              We store absolutely nothing. Your files transfer directly with military-grade End-to-End Encryption, making it impossible for hackers to intercept. Once shared, no traces remain.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center xl:justify-start">
               <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  E2E Encrypted
               </div>
               <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                  <FileIcon className="w-4 h-4 text-blue-500" />
                  Up to 5GB Daily
               </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col h-[500px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)]">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-4 border-b border-slate-100 flex items-center justify-between">
              Encrypted Room Chat
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Secure
              </div>
            </h3>
            
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-4 pr-2">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <p className="text-sm text-slate-500 font-medium">Say hi to your peer!</p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div key={idx} className={`p-3.5 rounded-2xl text-sm font-medium ${msg.sender === 'You' ? 'bg-blue-600 text-white ml-auto rounded-tr-sm shadow-sm' : 'bg-slate-100 text-slate-800 mr-auto rounded-tl-sm'} max-w-[85%] break-words`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={sendChatMessage} className="flex gap-2">
              <input 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message..." 
                className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-5 py-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm text-slate-900 font-medium"
              />
              <button 
                disabled={!chatInput.trim()}
                type="submit" 
                className="p-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Column: Transfer Card (Order 1 on mobile, 2 on desktop) */}
      <div className="w-full max-w-[420px] shrink-0 order-1 xl:order-2">
        <div className="w-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800 flex flex-col relative z-20 text-slate-900 dark:text-slate-100">
          
          {authError && !showPasswordPrompt && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center justify-center gap-3 text-red-600">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-sm">{authError}</span>
                  </div>
                  <button onClick={resetRoom} className="mt-1 px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold transition-colors shadow-sm">Start Over</button>
              </div>
          )}

          {limitError && (
              <div className="mb-6 p-5 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center justify-center gap-3 text-red-600">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span className="font-bold text-sm">Quota Reached</span>
                  </div>
                  <span className="font-medium text-sm text-center leading-relaxed">{limitError}</span>
                  <button onClick={() => setShowQuotaModal(true)} className="mt-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95">Request More Quota</button>
              </div>
          )}

          {!connected ? (
          <div className="flex flex-col items-center space-y-8">
              {roomId ? (
              <div className="flex flex-col items-center space-y-5 w-full">
                  <div className="bg-slate-50 dark:bg-white border border-slate-100 p-8 rounded-3xl relative w-full flex justify-center">
                    <QRCodeSVG value={`${baseUrl}?room=${roomId}`} size={180} />
                    {roomPassword && (
                        <div className="absolute -bottom-4 -right-4 bg-white p-3 rounded-full border border-slate-200 shadow-md">
                            <Lock className="w-5 h-5 text-blue-600" />
                        </div>
                    )}
                  </div>
                  <div className="text-center w-full">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1">
                      Room ID
                    </p>
                    <span className="text-slate-900 dark:text-slate-800 font-extrabold text-3xl tracking-tight bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100 inline-block">{roomId}</span>
                  </div>
                  
                  <p className="text-sm font-semibold text-slate-500">Waiting for peer to connect...</p>
                  
                  <button 
                  onClick={() => {
                      navigator.clipboard.writeText(`${baseUrl}?room=${roomId}`);
                      alert('Link copied!');
                  }}
                  className="w-full px-4 py-4 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold transition-colors shadow-sm"
                  >
                  Copy Join Link
                  </button>

                  <div className="flex w-full gap-3 mt-2">
                    <a 
                      href={`https://wa.me/?text=Join%20my%20secure%20file%20transfer%20room%20on%20NodeFerry:%20${encodeURIComponent(baseUrl + '?room=' + roomId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex justify-center items-center gap-2 py-3 bg-[#25D366] hover:bg-[#20b858] text-white rounded-xl font-bold transition-colors shadow-sm text-sm"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      WhatsApp
                    </a>
                    <a 
                      href={`https://t.me/share/url?url=${encodeURIComponent(baseUrl + '?room=' + roomId)}&text=Join%20my%20secure%20file%20transfer%20room%20on%20NodeFerry`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex justify-center items-center gap-2 py-3 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-xl font-bold transition-colors shadow-sm text-sm"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.381 4.025-1.627 4.476-1.635z"/></svg>
                      Telegram
                    </a>
                  </div>

                  <button
                  onClick={resetRoom}
                  className="w-full mt-1 px-4 py-3.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-semibold transition-colors text-sm"
                  >
                  Cancel & Go Back
                  </button>
              </div>
              ) : (
              <div className="flex flex-col w-full gap-5">
                  <div className="w-full flex flex-col gap-2 mb-2">
                    <label className="text-sm font-bold text-slate-700 pl-1">Room Password <span className="text-slate-400 font-medium">(Optional)</span></label>
                    <input 
                      type="password"
                      value={roomPassword}
                      onChange={e => setRoomPassword(e.target.value)}
                      placeholder="Leave blank for open access" 
                      className="bg-slate-50 border border-slate-200/60 rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                    />
                  </div>

                  <button 
                  onClick={createRoom}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 text-[15px]"
                  >
                  Create New Room
                  </button>
                  
                  <div className="relative w-full flex items-center justify-center my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative bg-white px-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Or Join</div>
                  </div>

                  <form onSubmit={handleJoinSubmit} className="w-full flex gap-2">
                  <input 
                      name="roomInput"
                      placeholder="Enter Room ID" 
                      className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 min-w-0"
                      required
                  />
                  <button 
                      type="submit"
                      className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                  >
                      Join
                  </button>
                  </form>
              </div>
              )}
          </div>
          ) : (
          <div className="flex flex-col items-center w-full">
              <div className="flex items-center justify-between mb-8 text-emerald-700 bg-emerald-50/80 border border-emerald-100/80 px-5 py-3 rounded-xl w-full shadow-sm">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="font-bold text-[15px]">Securely Connected</span>
                </div>
                <button onClick={resetRoom} className="text-slate-400 hover:text-slate-700 transition-colors bg-white p-1.5 rounded-md shadow-sm border border-slate-200/50" title="Disconnect">
                   <LogOut className="w-4 h-4" />
                </button>
              </div>
              
              <input 
              type="file" 
              id="fileInput" 
              className="hidden" 
              multiple
              onChange={handleFileSelect} 
              />
              
              <div 
              className="w-full bg-slate-50/50 hover:bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-10 flex flex-col items-center justify-center transition-all group cursor-pointer text-center min-h-[220px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('fileInput')?.click()}
              >
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 group-hover:-translate-y-1 transition-transform">
                <UploadCloud className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-[17px] font-bold text-slate-800 mb-1">Click or drag files to share</p>
              <p className="text-[13px] font-semibold text-slate-400">Encrypted P2P transfer</p>
              </div>

              {fileWarning && (
                <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl flex items-start gap-3 shadow-sm w-full">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span className="leading-relaxed">{fileWarning}</span>
                </div>
              )}

              {files.length > 0 && (
                  <div className="flex flex-col w-full gap-3 mt-8">
                  <div className="text-xs text-slate-400 mb-1 flex justify-between font-bold items-center uppercase tracking-wider px-1">
                      <span>Queue ({currentFileIndex + 1}/{files.length})</span>
                      {isSecureE2EE && (
                          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <ShieldCheck className="w-3.5 h-3.5" /> E2EE
                          </div>
                      )}
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-2.5">
                    {files.map((f, idx) => (
                        <div key={idx} className={`flex items-center gap-3.5 w-full p-3 rounded-xl border transition-colors ${idx === currentFileIndex && transferProgress > 0 ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-200/60 shadow-sm'}`}>
                            <div className={`p-2 rounded-lg ${idx === currentFileIndex && transferProgress > 0 ? 'bg-blue-100' : 'bg-slate-50 border border-slate-100'}`}>
                               <FileIcon className={`w-4 h-4 ${idx === currentFileIndex && transferProgress > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
                            </div>
                            <span className="text-sm font-semibold truncate flex-1 text-left text-slate-700">{f.name}</span>
                            <span className="text-xs font-bold text-slate-400 shrink-0">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                            {idx === currentFileIndex && transferProgress === 100 && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        </div>
                    ))}
                  </div>
                  
                  {transferProgress > 0 && transferProgress < 100 && (
                      <div className="w-full flex flex-col gap-2 mt-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                              <span>Transferring...</span>
                              <span className="text-blue-600">{transferProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                              <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300 relative" 
                              style={{ width: `${transferProgress}%` }}
                              >
                                <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                              </div>
                          </div>
                          {(transferSpeed || eta) && (
                              <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                  <span>{transferSpeed}</span>
                                  <span>{eta}</span>
                              </div>
                          )}
                      </div>
                  )}
                  </div>
              )}

              {receivingFile && (
                  <div className="flex flex-col w-full gap-3 mt-8">
                    <div className="text-xs text-slate-400 mb-1 flex justify-between font-bold items-center uppercase tracking-wider px-1">
                        <span>Receiving File</span>
                        {isSecureE2EE && (
                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <ShieldCheck className="w-3.5 h-3.5" /> E2EE
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3.5 w-full p-3 rounded-xl border bg-blue-50/50 border-blue-200">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <FileIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold truncate flex-1 text-left text-slate-700">{receivingFile.name}</span>
                        <span className="text-xs font-bold text-slate-400 shrink-0">{(receivingFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        {transferProgress === 100 && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    </div>

                    {transferProgress > 0 && transferProgress < 100 && (
                        <div className="w-full flex flex-col gap-2 mt-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                <span>Receiving...</span>
                                <span className="text-blue-600">{transferProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                                <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300 relative" 
                                style={{ width: `${transferProgress}%` }}
                                >
                                  <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                            {(transferSpeed || eta) && (
                                <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                    <span>{transferSpeed}</span>
                                    <span>{eta}</span>
                                </div>
                            )}
                        </div>
                    )}
                  </div>
              )}

              <button 
                  onClick={(e) => {
                  e.stopPropagation();
                  sendAllFiles();
                  }}
                  disabled={files.length === 0 || (transferProgress > 0 && transferProgress < 100) || !!limitError}
                  className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white disabled:cursor-not-allowed rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 text-[15px]"
              >
                  {transferProgress > 0 && transferProgress < 100 ? `Transferring...` : `Send ${files.length} File${files.length !== 1 ? 's' : ''}`}
              </button>
          </div>
          )}
        </div>
      </div>

    </div>
  );
}
