'use client';

import { useEffect, useState, Suspense } from 'react';
import { ShieldCheck, Download, AlertTriangle, Lock } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

function DownloadContent() {
  const [linkId, setLinkId] = useState('');
  const [keyHex, setKeyHex] = useState('');
  const [saltHex, setSaltHex] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');
  
  const [branding, setBranding] = useState<{ brand_name?: string, brand_logo_url?: string } | null>(null);
  
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionSuccess, setDecryptionSuccess] = useState(false);
  const [error, setError] = useState('');

  // 1. Parse Hash on Mount
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    // For backwards compatibility, it might still have 'url' instead of 'id'.
    // If it has 'url', we bypass the new API check (or fail gracefully).
    const id = params.get('id');
    const url = decodeURIComponent(params.get('url') || '');
    
    if (id) {
        setLinkId(id);
    } else if (url) {
        // Legacy link support
        setError('This is a legacy link. Proceed with download but burn-after-reading is not supported.');
    }
    
    setKeyHex(params.get('key') || '');
    setSaltHex(params.get('salt') || '');
    setIsProtected(params.get('protected') === '1');
    setFileName(decodeURIComponent(params.get('name') || 'secure_file'));
  }, []);

  const processDownload = async () => {
    if (!keyHex || (!linkId && !error.includes('legacy'))) {
      setError("Secure link is invalid.");
      return;
    }
    
    if (isProtected && !password) {
        setError("Please enter the password to decrypt the master key.");
        return;
    }
    
    setIsDecrypting(true);
    setError('');
    
    try {
      const { decryptChunk, decryptMasterKey } = await import('@/utils/cryptoCloud');
      
      let finalMasterKey = keyHex;
      
      // Decrypt the Master Key if protected
      if (isProtected && saltHex) {
          try {
              finalMasterKey = await decryptMasterKey(keyHex, password, saltHex);
          } catch (e) {
              throw new Error("Incorrect password or corrupted secure key.");
          }
      }
      
      let manifestUrl = '';
      
      // 2. Fetch Link Details from API
      if (linkId) {
          const apiRes = await fetch(`/api/links/${linkId}`);
          const apiData = await apiRes.json();
          
          if (!apiRes.ok) {
              throw new Error(apiData.error || "Failed to fetch link details.");
          }
          
          manifestUrl = apiData.manifest_url;
          if (apiData.branding) {
              setBranding(apiData.branding);
          }
      } else {
          // Legacy support: extract URL from hash directly
          const params = new URLSearchParams(window.location.hash.substring(1));
          manifestUrl = decodeURIComponent(params.get('url') || '');
      }
      
      // 3. Fetch Manifest
      const manifestRes = await fetch(manifestUrl);
      if (!manifestRes.ok) {
          throw new Error("Failed to fetch secure manifest. The link might be expired or blocked.");
      }
      const manifest = await manifestRes.json();
      
      if (!manifest.chunks || !Array.isArray(manifest.chunks)) {
          throw new Error("Invalid secure manifest.");
      }
      
      const totalChunks = manifest.chunks.length;
      const decryptedBlobs: Blob[] = [];
      
      // 4. Download and Decrypt Chunks
      for (let i = 0; i < totalChunks; i++) {
          const chunkUrl = manifest.chunks[i];
          const chunkRes = await fetch(chunkUrl);
          
          if (!chunkRes.ok) {
              throw new Error(`Failed to download chunk ${i+1}. It might be blocked.`);
          }
          
          const encryptedBlob = await chunkRes.blob();
          
          try {
              const decryptedBlob = await decryptChunk(encryptedBlob, finalMasterKey, i);
              decryptedBlobs.push(decryptedBlob);
          } catch (e) {
              throw new Error("Decryption failed. If password protected, the password might be wrong.");
          }
      }
      
      // 5. Combine and Download
      const finalBlob = new Blob(decryptedBlobs);
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = manifest.name || fileName.replace('.enc', '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsDecrypting(false);
      setDecryptionSuccess(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to download and decrypt. The link may have expired.");
      setIsDecrypting(false);
    }
  };

  if (!keyHex) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid Secure Link</h1>
        <p className="text-slate-500 max-w-md">The URL seems to be missing the secure encryption key or file identifier.</p>
        <Link href="/" className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">Go to Homepage</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto p-6 md:p-12 font-sans min-h-[calc(100vh-160px)] pt-20">
      
      {branding ? (
        <div className="flex flex-col items-center mb-10 gap-3">
            {branding.brand_logo_url ? (
                <img src={branding.brand_logo_url} alt={branding.brand_name || 'Brand Logo'} className="h-16 w-auto object-contain rounded-xl" />
            ) : (
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{branding.brand_name}</h1>
            )}
            <p className="text-slate-500 font-medium">Sent you a secure file via NodeFerry</p>
        </div>
      ) : (
        <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold mb-4 text-slate-900 dark:text-white tracking-tight">
            Unlock Secure File
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            This file was encrypted on the sender's device and stored securely. 
            </p>
        </div>
      )}

      <div className="w-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800 flex flex-col relative z-20">
        
        <div className="flex items-center justify-between mb-8 text-emerald-700 bg-emerald-50/80 border border-emerald-100/80 px-5 py-3 rounded-xl w-full shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-[14px]">End-to-End Encrypted</span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4 py-4">
            {isDecrypting ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-base font-bold text-blue-600">Securely downloading and decrypting...</span>
                <p className="text-xs text-slate-500 font-medium max-w-[280px] text-center">Large files may take a few minutes to process.</p>
              </div>
            ) : decryptionSuccess ? (
              <div className="flex flex-col items-center justify-center gap-3 bg-emerald-50 w-full rounded-2xl p-6 border border-emerald-100 text-center">
                <ShieldCheck className="w-12 h-12 text-emerald-500 mb-1" />
                <span className="text-lg font-bold text-emerald-700">Decryption Successful!</span>
                <span className="text-sm font-medium text-emerald-600">The file has been saved to your downloads folder.</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center mb-4">
                  Ready to download <strong>{fileName.replace('.enc', '')}</strong>
                </p>
                
                {isProtected && (
                    <div className="w-full mb-4 flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Lock className="w-3.5 h-3.5"/> Password Required</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter password to decrypt" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                )}
                
                <button 
                  onClick={processDownload}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-sm transition-all text-[15px]"
                >
                  <Download className="w-5 h-5" />
                  Decrypt & Download
                </button>
              </>
            )}
            {error && !error.includes('legacy') && <p className="text-sm font-bold text-red-500 mt-2 text-center bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DownloadContent />
    </Suspense>
  );
}
