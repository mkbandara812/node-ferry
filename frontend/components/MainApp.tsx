'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UploadCloud, CheckCircle, File as FileIcon, Lock, ShieldAlert, ShieldCheck, Send, LogOut, Coffee, History, X } from 'lucide-react';
import { get, set } from 'idb-keyval';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export interface TransferRecord {
  id: string;
  filename: string;
  size: number;
  date: string;
  role: 'sent' | 'received';
}

export default function MainApp({ initialRoomId }: { initialRoomId?: string } = {}) {
  const [roomId, setRoomId] = useState<string>(initialRoomId || '');
  const [connected, setConnected] = useState<boolean>(false);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [files, setFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [receivingFile, setReceivingFile] = useState<{name: string, size: number} | null>(null);

  // Password Feature State
  const [roomPassword, setRoomPassword] = useState<string>('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
  const [showDonationPopup, setShowDonationPopup] = useState<boolean>(false);
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);

  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [transferMode, setTransferMode] = useState<'p2p' | 'cloud'>('p2p');
  const [cloudLink, setCloudLink] = useState<string>('');

  // Premium Cloud Link Configuration
  const [cloudExpiry, setCloudExpiry] = useState<number>(24);
  const [cloudBurnAfterReading, setCloudBurnAfterReading] = useState<boolean>(false);
  const [cloudPassword, setCloudPassword] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('nodeferry_history');
    if (saved) {
      try { setTransferHistory(JSON.parse(saved)); } catch (e) {}
    }
    
    // Capture referral code from URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
        localStorage.setItem('nodeferry_ref_code', refCode);
    }
  }, []);

  const addHistoryRecord = (record: TransferRecord) => {
    setTransferHistory(prev => {
      const newHistory = [record, ...prev].slice(0, 100);
      localStorage.setItem('nodeferry_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const removeFile = (idxToRemove: number) => {
      setFiles(prev => prev.filter((_, i) => i !== idxToRemove));
  };

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
  
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const dataChannelsRef = useRef<Record<string, RTCDataChannel>>({});
  const myClientIdRef = useRef<string>('');
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
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    Object.values(dataChannelsRef.current).forEach(dc => dc.close());
    dataChannelsRef.current = {};
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    releaseWakeLock();

    setRoomId('');
    setConnected(false);
    setPeerCount(0);
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
    setCloudLink('');
    
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

  useEffect(() => {
    if (showQRScanner) {
      let scannerInstance: any = null;
      import('html5-qrcode').then((html5Qrcode) => {
        scannerInstance = new html5Qrcode.Html5QrcodeScanner('qr-reader', {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        }, false);
        
        scannerInstance.render((text: string) => {
          scannerInstance.clear();
          setShowQRScanner(false);
          try {
            const url = new URL(text);
            const r = url.searchParams.get('room');
            if (r) joinRoom(r);
          } catch(e) {
             joinRoom(text);
          }
        }, () => {});
      });

      return () => {
         if (scannerInstance) scannerInstance.clear().catch(() => {});
      };
    }
  }, [showQRScanner]);

  const initWebRTC = (peerId: string) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(JSON.stringify({ type: 'candidate', candidate: event.candidate, target: peerId }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          pc.close();
          delete peersRef.current[peerId];
          delete dataChannelsRef.current[peerId];
          if (Object.keys(peersRef.current).length === 0) {
              setAuthError('Connection lost. The peer may have disconnected.');
              setConnected(false);
              setIsSecureE2EE(false);
              releaseWakeLock();
          }
      }
    };

    pc.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      receiveChannel.binaryType = 'arraybuffer';
      receiveChannel.onmessage = handleReceiveMessage;
      receiveChannel.onopen = () => {
          setConnected(true);
          setPeerCount(prev => prev + 1);
          setShowPasswordPrompt(false);
          requestWakeLock();
      };
      dataChannelsRef.current[peerId] = receiveChannel;
    };

    peersRef.current[peerId] = pc;
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
          Object.values(dataChannelsRef.current).forEach(ch => {
              if (ch.readyState === 'open') ch.send(JSON.stringify({ type: 'resume_request', offset: receivedSizeRef.current }));
          });
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
        
        if (incomingFileMetaRef.current) {
          addHistoryRecord({
            id: crypto.randomUUID(),
            filename: incomingFileMetaRef.current.name,
            size: incomingFileMetaRef.current.size,
            date: new Date().toISOString(),
            role: 'received'
          });
        }
        
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

  const proceedToOffer = async (peerId: string) => {
    const pc = initWebRTC(peerId);
    const dataChannel = pc.createDataChannel('fileTransfer');
    dataChannel.binaryType = 'arraybuffer';
    dataChannel.onopen = () => {
        setConnected(true);
        setPeerCount(prev => prev + 1);
        requestWakeLock();
    };
    dataChannel.onmessage = handleReceiveMessage;
    dataChannelsRef.current[peerId] = dataChannel;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    wsRef.current?.send(JSON.stringify({ type: 'offer', offer, target: peerId }));
  };

  const connectSignalingServer = async (id: string, isInitiator: boolean) => {
    const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:8080';
    const ws = new WebSocket(`${signalingUrl}/room/${id}`);
    wsRef.current = ws;

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      if (Object.keys(peersRef.current).length === 0) {
        setAuthError('Signaling Server is offline. Please make sure the backend is running.');
      }
    };

    ws.onclose = (event) => {
      const isPeerConnected = Object.values(peersRef.current).some(pc => pc.connectionState === 'connected' || pc.iceConnectionState === 'connected');
      
      if (!event.wasClean && !isPeerConnected) {
        setTimeout(() => {
            if (Object.keys(peersRef.current).length === 0) {
                connectSignalingServer(id, isInitiator);
            }
        }, 3000);
      }
    };

    ws.onopen = async () => {
      setAuthError('');
      if (!isInitiator) {
        ws.send(JSON.stringify({ type: 'join' }));
      }
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'welcome') {
          myClientIdRef.current = message.clientId;
          return;
      }

      if (message.type === 'limit_exceeded') {
          setLimitError(message.message || 'Daily transfer limit reached.');
          return;
      } 
      
      if (message.type === 'leave') {
          const peerId = message.from;
          if (peersRef.current[peerId]) {
              if (dataChannelsRef.current[peerId] && dataChannelsRef.current[peerId].readyState === 'open') {
                  setPeerCount(prev => Math.max(0, prev - 1));
              }
              peersRef.current[peerId].close();
              delete peersRef.current[peerId];
              delete dataChannelsRef.current[peerId];
          }
          if (Object.keys(peersRef.current).length === 0) {
              setConnected(false);
              setPeerCount(0);
          }
          return;
      }

      const peerId = message.from;
      if (!peerId) return;

      if (message.type === 'join' && isInitiator) {
        if (roomPassword) {
            ws.send(JSON.stringify({ type: 'auth_required', target: peerId }));
        } else {
            proceedToOffer(peerId);
        }
      } else if (message.type === 'auth_required' && !isInitiator) {
          setShowPasswordPrompt(true);
      } else if (message.type === 'auth' && isInitiator) {
          if (message.password === roomPassword) {
              proceedToOffer(peerId);
          } else {
              ws.send(JSON.stringify({ type: 'auth_failed', target: peerId }));
          }
      } else if (message.type === 'auth_failed' && !isInitiator) {
          setAuthError('Incorrect password. Please try again.');
      } else if (message.type === 'offer') {
        const pc = initWebRTC(peerId);
        await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', answer, target: peerId }));
      } else if (message.type === 'answer') {
        const pc = peersRef.current[peerId];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
      } else if (message.type === 'candidate') {
        const pc = peersRef.current[peerId];
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
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

  const traverseFileTree = async (item: any, path: string = ''): Promise<File[]> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          resolve([file]);
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries: any[]) => {
          let files: File[] = [];
          for (const entry of entries) {
            const nestedFiles = await traverseFileTree(entry, path + item.name + '/');
            files = [...files, ...nestedFiles];
          }
          resolve(files);
        });
      } else {
        resolve([]);
      }
    });
  };

  const processSelectedFiles = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      if (updatedFiles.length > 1) {
          setFileWarning("Notice: Sending folders or multiple files will trigger multiple download prompts for the receiver. We highly recommend putting them in a .zip folder first if possible.");
      } else {
          setFileWarning('');
      }
      setFiles(updatedFiles);
      set('nodeferry_files', updatedFiles).catch(console.error);
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.items) {
      let droppedFiles: File[] = [];
      const items = Array.from(e.dataTransfer.items);
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            const nestedFiles = await traverseFileTree(entry);
            droppedFiles = [...droppedFiles, ...nestedFiles];
          } else {
            const file = item.getAsFile();
            if (file) droppedFiles.push(file);
          }
        }
      }
      processSelectedFiles(droppedFiles);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
    }
  };

  const sendSingleFile = (file: File, startOffset: number = 0) => {
      return new Promise<void>(async (resolve, reject) => {
          if (limitError) return reject(new Error('Limit exceeded'));
          
          const CHUNK_SIZE = 16 * 1024;
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
          const e2eMessage = JSON.stringify({ 
              type: 'e2e_key', 
              key: Array.from(new Uint8Array(exported)) 
          });
          Object.values(dataChannelsRef.current).forEach(ch => {
              if (ch.readyState === 'open') ch.send(e2eMessage);
          });
          setIsSecureE2EE(true);

          resumeOffsetRef.current = 0;
          if (startOffset === 0) {
            const metaMessage = JSON.stringify({ 
                type: 'meta', 
                name: file.name, 
                size: file.size,
                encrypted: true
            });
            Object.values(dataChannelsRef.current).forEach(ch => {
                if (ch.readyState === 'open') ch.send(metaMessage);
            });
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
              while (offset < file.size) {
                  const isAnyBuffered = Object.values(dataChannelsRef.current).some(ch => ch.readyState === 'open' && ch.bufferedAmount > 65535);
                  if (isAnyBuffered) {
                      setTimeout(sendChunk, 10);
                      return;
                  }
                  
                  const end = Math.min(offset + CHUNK_SIZE, file.size);
                  const chunkBlob = file.slice(offset, end);
                  const chunkArrayBuffer = await chunkBlob.arrayBuffer();
                  
                  let dataToSend: ArrayBuffer = chunkArrayBuffer;

                  if (key) {
                      const iv = crypto.getRandomValues(new Uint8Array(12));
                      const encrypted = await crypto.subtle.encrypt(
                          { name: "AES-GCM", iv: iv },
                          key,
                          chunkArrayBuffer
                      );
                      const payload = new Uint8Array(iv.length + encrypted.byteLength);
                      payload.set(iv, 0);
                      payload.set(new Uint8Array(encrypted), iv.length);
                      dataToSend = payload.buffer;
                  }
                  
                  Object.values(dataChannelsRef.current).forEach(ch => {
                      if (ch.readyState === 'open') ch.send(dataToSend);
                  });
                  offset = end;
                  
                  setTransferProgress(Math.min(100, Math.round((offset / file.size) * 100)));
                  calculateAnalytics(offset, file.size);
              }

              if (offset >= file.size) {
                  Object.values(dataChannelsRef.current).forEach(ch => {
                      if (ch.readyState === 'open') ch.send(JSON.stringify({ type: 'end' }));
                  });
                  setTransferSpeed('Complete');
                  setEta('');
                  
                  addHistoryRecord({
                    id: crypto.randomUUID(),
                    filename: file.name,
                    size: file.size,
                    date: new Date().toISOString(),
                    role: 'sent'
                  });
                  
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
    const hasOpenChannel = Object.values(dataChannelsRef.current).some(ch => ch.readyState === 'open');
    if (files.length === 0 || !hasOpenChannel) return;

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

  const uploadCloudFiles = async () => {
      if (files.length === 0) return;
      const { generateKey, exportKeyToHex, encryptChunk, encryptMasterKey } = await import('../utils/cryptoCloud');
      const { uploadToCloud } = await import('../utils/storageApi');
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      setTransferProgress(0); // Indicate start
      setTransferSpeed('Preparing encryption...');
      
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;
          
          const fileToUpload = files[0];
          
          const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunk limit
          const totalChunks = Math.ceil(fileToUpload.size / CHUNK_SIZE);
          
          const key = await generateKey();
          let keyHex = await exportKeyToHex(key);
          
          let finalKeyParam = keyHex;
          let saltParam = '';
          
          if (cloudPassword) {
              setTransferSpeed('Encrypting Master Key...');
              const { encryptedKeyHex, saltHex } = await encryptMasterKey(keyHex, cloudPassword);
              finalKeyParam = encryptedKeyHex;
              saltParam = saltHex;
          }
          
          const uploadedChunkUrls: string[] = [];
          
          for (let i = 0; i < totalChunks; i++) {
              setTransferSpeed(`Encrypting & Uploading chunk ${i + 1} of ${totalChunks}...`);
              const start = i * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, fileToUpload.size);
              const chunk = fileToUpload.slice(start, end);
              
              const encryptedChunkBlob = await encryptChunk(chunk, keyHex, i);
              
              const result = await uploadToCloud(encryptedChunkBlob, `chunk_${i}.enc`, (p) => {
                  const overallProgress = ((i + (p / 100)) / totalChunks) * 95;
                  setTransferProgress(overallProgress);
              });
              
              uploadedChunkUrls.push(result.downloadUrl);
          }
          
          setTransferSpeed('Finalizing manifest...');
          setTransferProgress(95);
          
          const manifest = {
              name: fileToUpload.name,
              size: fileToUpload.size,
              chunks: uploadedChunkUrls
          };
          
          const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
          const manifestResult = await uploadToCloud(manifestBlob, 'manifest.json', undefined, {
              isManifest: true,
              totalSize: fileToUpload.size,
              expiryHours: cloudExpiry,
              isBurnAfterReading: cloudBurnAfterReading,
              userId: userId
          });
          
          setTransferProgress(100);
          setTransferSpeed('Complete');
          
          let linkParams = `id=${manifestResult.linkId}&key=${finalKeyParam}&name=${encodeURIComponent(fileToUpload.name)}`;
          if (saltParam) linkParams += `&salt=${saltParam}`;
          if (cloudPassword) linkParams += `&protected=1`;
          
          setCloudLink(`${baseUrl}/dl#${linkParams}`);
          
          addHistoryRecord({
            id: crypto.randomUUID(),
            filename: fileToUpload.name,
            size: fileToUpload.size,
            date: new Date().toISOString(),
            role: 'sent'
          });
          
          playSound('success');
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      } catch (e: any) {
          console.error(e);
          setAuthError(e.message || "Failed to upload to cloud");
          setTransferProgress(0);
          setTransferSpeed('');
      }
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const hasOpenChannel = Object.values(dataChannelsRef.current).some(ch => ch.readyState === 'open');
    if (!chatInput.trim() || !hasOpenChannel) return;

    Object.values(dataChannelsRef.current).forEach(ch => {
        if (ch.readyState === 'open') ch.send(JSON.stringify({ type: 'chat', text: chatInput }));
    });
    setMessages(prev => [...prev, { sender: 'You', text: chatInput }]);
    setChatInput('');
  };

  const sendPasswordAuth = () => {
      wsRef.current?.send(JSON.stringify({ type: 'auth', password: joinPassword }));
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



      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 max-w-md w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh]">
            <button 
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors z-[110]"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">Transfer History</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              Your recent secure transfers. This data is only saved in your browser.
            </p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {transferHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-medium">No transfers yet.</div>
              ) : (
                transferHistory.map(record => (
                  <div key={record.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl flex items-center gap-3 border border-slate-100 dark:border-slate-800">
                    <div className={`p-2 rounded-lg ${record.role === 'sent' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {record.role === 'sent' ? <UploadCloud className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{record.filename}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        {record.role === 'sent' ? 'Sent' : 'Received'} • {(record.size / 1024 / 1024).toFixed(2)} MB • {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowQRScanner(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-[110]"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Scan QR Code</h3>
            <div id="qr-reader" className="w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-200 text-slate-900 [&_a]:text-blue-600 [&_a]:font-bold [&_span]:text-slate-800 [&_span]:font-medium [&_img]:opacity-100 [&_select]:bg-white [&_select]:text-slate-800 [&_select]:border-slate-200 [&_select]:rounded-lg [&_button]:bg-blue-600 [&_button]:text-white [&_button]:px-4 [&_button]:py-2 [&_button]:rounded-lg [&_button]:font-bold [&_button]:mt-2"></div>
            <p className="text-center text-sm font-medium text-slate-500 mt-4">Point your camera at the receiver's QR code to join instantly.</p>
          </div>
        </div>
      )}

      {/* Left Column: Text / Chat (Order 2 on mobile, 1 on desktop) */}
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
                  {transferMode === 'p2p' ? 'E2E Encrypted' : 'Encrypted Uploads'}
               </div>
               <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                  <FileIcon className="w-4 h-4 text-blue-500" />
                  {transferMode === 'p2p' ? 'Up to 500MB Free / 5GB Daily' : 'Unlimited Size (Credits)'}
               </div>
               <button onClick={() => setShowHistoryModal(true)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <History className="w-4 h-4 text-purple-500" />
                  History
               </button>
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
                  <button onClick={() => { setTransferMode('cloud'); resetRoom(); }} className="mt-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95">Switch to Cloud Link</button>
              </div>
          )}
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl mb-6 w-full">
            <button 
              onClick={() => { setTransferMode('p2p'); resetRoom(); }} 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${transferMode === 'p2p' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Live P2P
            </button>
            <button 
              onClick={() => { setTransferMode('cloud'); resetRoom(); }} 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${transferMode === 'cloud' ? 'bg-white dark:bg-slate-900 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Cloud Link
            </button>
          </div>

          {transferMode === 'cloud' && (
            <div className="flex flex-col items-center w-full">
              {cloudLink ? (
                <div className="flex flex-col items-center space-y-5 w-full">
                  <div className="bg-slate-50 dark:bg-white border border-slate-100 p-8 rounded-3xl relative w-full flex justify-center">
                    <QRCodeSVG value={cloudLink} size={180} />
                  </div>
                  <div className="text-center w-full">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1">
                      Secure Link Generated
                    </p>
                  </div>
                  
                  <button 
                  onClick={() => {
                      navigator.clipboard.writeText(cloudLink);
                      toast.success('Cloud link copied!');
                  }}
                  className="w-full px-4 py-4 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl font-bold transition-colors shadow-sm"
                  >
                  Copy Cloud Link
                  </button>
                  <button
                  onClick={() => { resetRoom(); setCloudLink(''); }}
                  className="w-full mt-1 px-4 py-3.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-semibold transition-colors text-sm"
                  >
                  Send Another
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6 text-purple-700 bg-purple-50/80 border border-purple-100/80 px-5 py-3 rounded-xl w-full shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-5 h-5 text-purple-500" />
                      <span className="font-bold text-[14px]">Encrypted Cloud Link</span>
                    </div>
                  </div>
                  
                  <input type="file" id="fileInput" className="hidden" onChange={handleFileSelect} />
                  
                  <div 
                  className="w-full bg-slate-50/50 hover:bg-slate-50 border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-2xl p-10 flex flex-col items-center justify-center transition-all group cursor-pointer text-center min-h-[220px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                      document.getElementById('fileInput')?.click();
                    }
                  }}
                  >
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 group-hover:-translate-y-1 transition-transform">
                      <UploadCloud className="w-8 h-8 text-purple-500" />
                    </div>
                    <p className="text-[17px] font-bold text-slate-800 mb-1">Select file to Encrypt</p>
                    <p className="text-[13px] font-semibold text-slate-400 mb-4">Unlimited Size • Max Speed</p>
                    <button onClick={() => document.getElementById('fileInput')?.click()} className="px-5 py-2.5 bg-purple-100 text-purple-700 font-bold rounded-lg text-sm hover:bg-purple-200 transition-colors">Select File</button>
                  </div>

                  {files.length > 0 && (
                      <div className="flex flex-col w-full gap-3 mt-6">
                        <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-2.5">
                          {files.map((f, idx) => (
                              <div key={idx} className="flex items-center gap-3.5 w-full p-3 rounded-xl border bg-white border-slate-200/60 shadow-sm">
                                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                     <FileIcon className="w-4 h-4 text-slate-400" />
                                  </div>
                                  <span className="text-sm font-semibold truncate flex-1 text-left text-slate-700">{f.name}</span>
                                  <span className="text-xs font-bold text-slate-400 shrink-0">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                                  <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors">
                                     <X className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                        </div>
                        
                        {transferProgress > 0 && transferProgress < 100 && (
                            <div className="w-full flex flex-col gap-2 mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                    <span>{transferSpeed || 'Working...'}</span>
                                    <span className="text-purple-600">{Math.round(transferProgress)}%</span>
                                </div>
                                <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                                    <div 
                                    className="bg-purple-600 h-2 rounded-full transition-all duration-300 relative" 
                                    style={{ width: `${transferProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                      </div>
                  )}
                  
                  {files.length > 0 && transferProgress === 0 && (
                      <div className="flex flex-col w-full gap-4 mt-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-purple-500" />
                              Premium Security Settings
                          </h3>
                          
                          <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase">Link Expiry</label>
                              <select 
                                  value={cloudExpiry}
                                  onChange={e => setCloudExpiry(Number(e.target.value))}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                              >
                                  <option value={1}>1 Hour (0.5x Credits)</option>
                                  <option value={24}>24 Hours (1x Credits)</option>
                                  <option value={168}>7 Days (2x Credits)</option>
                              </select>
                          </div>
                          
                          <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Burn After Reading</span>
                                  <span className="text-xs text-slate-500 font-medium">Delete automatically after 1 download</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" className="sr-only peer" checked={cloudBurnAfterReading} onChange={e => setCloudBurnAfterReading(e.target.checked)} />
                                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                              </label>
                          </div>
                          
                          <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase">Password Protection (Optional)</label>
                              <input 
                                  type="password" 
                                  value={cloudPassword}
                                  onChange={e => setCloudPassword(e.target.value)}
                                  placeholder="Leave blank for open access" 
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                              />
                          </div>
                      </div>
                  )}

                  <button 
                      onClick={(e) => { e.stopPropagation(); uploadCloudFiles(); }}
                      disabled={files.length === 0 || (transferProgress > 0 && transferProgress < 100)}
                      className="mt-6 w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white disabled:cursor-not-allowed rounded-xl font-bold shadow-md shadow-purple-500/20 transition-all active:scale-95 text-[15px]"
                  >
                      {transferProgress > 0 && transferProgress < 100 ? `Processing...` : `Encrypt & Get Link`}
                  </button>
                </>
              )}
            </div>
          )}

          {transferMode === 'p2p' && !connected ? (
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
                      toast.success('Link copied!');
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
                  <button
                      type="button"
                      onClick={() => setShowQRScanner(true)}
                      className="px-4 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center"
                      title="Scan QR Code"
                  >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                  </button>
                  </form>
              </div>
              )}
          </div>
          ) : transferMode === 'p2p' && connected ? (
          <div className="flex flex-col items-center w-full">
              <div className="flex items-center justify-between mb-8 text-emerald-700 bg-emerald-50/80 border border-emerald-100/80 px-5 py-3 rounded-xl w-full shadow-sm">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="font-bold text-[15px]">Connected to {peerCount} {peerCount === 1 ? 'Peer' : 'Peers'}</span>
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
              <input 
              type="file" 
              id="folderInput" 
              className="hidden" 
              {...{webkitdirectory: "true", directory: "true", multiple: true} as any}
              onChange={handleFileSelect} 
              />
              
              <div 
              className="w-full bg-slate-50/50 hover:bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-10 flex flex-col items-center justify-center transition-all group cursor-pointer text-center min-h-[220px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={(e) => {
                // Prevent click if they are clicking the specific buttons inside
                if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                  document.getElementById('fileInput')?.click();
                }
              }}
              >
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 group-hover:-translate-y-1 transition-transform">
                  <UploadCloud className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-[17px] font-bold text-slate-800 mb-1">Click or drag files here</p>
                <p className="text-[13px] font-semibold text-slate-400 mb-4">Encrypted P2P transfer</p>
                <div className="flex gap-2">
                  <button onClick={() => document.getElementById('fileInput')?.click()} className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm hover:bg-blue-200 transition-colors">Select Files</button>
                  <button onClick={() => document.getElementById('folderInput')?.click()} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-200 transition-colors">Select Folder</button>
                </div>
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
                            {transferProgress === 0 && (
                                <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors shrink-0">
                                   <X className="w-4 h-4" />
                                </button>
                            )}
                            {idx === currentFileIndex && transferProgress === 100 && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
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
          ) : null}
        </div>
      </div>

    </div>
  );
}
