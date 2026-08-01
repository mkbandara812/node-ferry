export async function generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function exportKeyToHex(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey("raw", key);
    const buffer = new Uint8Array(exported);
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function importKeyFromHex(hex: string): Promise<CryptoKey> {
    const buffer = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    return await crypto.subtle.importKey(
        "raw",
        buffer as any,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
    );
}

function getIVForChunk(chunkIndex: number): Uint8Array {
    const iv = new Uint8Array(12);
    const view = new DataView(iv.buffer);
    view.setUint32(0, chunkIndex, true); // Use chunk index as IV to ensure uniqueness per chunk for the same key
    return iv;
}

export async function encryptChunk(chunk: Blob, keyHex: string, chunkIndex: number): Promise<Blob> {
    const key = await importKeyFromHex(keyHex);
    const iv = getIVForChunk(chunkIndex);
    
    const arrayBuffer = await chunk.arrayBuffer();
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as any },
        key,
        arrayBuffer as any
    );
    
    return new Blob([encryptedBuffer], { type: 'application/octet-stream' });
}

export async function decryptChunk(encryptedChunk: Blob, keyHex: string, chunkIndex: number): Promise<Blob> {
    const key = await importKeyFromHex(keyHex);
    const iv = getIVForChunk(chunkIndex);
    
    const arrayBuffer = await encryptedChunk.arrayBuffer();
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as any },
        key,
        arrayBuffer as any
    );
    
    return new Blob([decryptedBuffer]);
}

export async function deriveKeyFromPassword(password: string, saltHex: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
    );
    
    const saltBuffer = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltBuffer as any,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encryptMasterKey(masterKeyHex: string, password: string): Promise<{ encryptedKeyHex: string, saltHex: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const kek = await deriveKeyFromPassword(password, saltHex);
    
    const masterKeyBuffer = new Uint8Array(masterKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(12);
    
    const encryptedMasterKeyBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as any },
        kek,
        masterKeyBuffer as any
    );
    
    const encryptedKeyHex = Array.from(new Uint8Array(encryptedMasterKeyBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return { encryptedKeyHex, saltHex };
}

export async function decryptMasterKey(encryptedKeyHex: string, password: string, saltHex: string): Promise<string> {
    const kek = await deriveKeyFromPassword(password, saltHex);
    const encryptedBuffer = new Uint8Array(encryptedKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(12);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as any },
        kek,
        encryptedBuffer as any
    );
    
    return Array.from(new Uint8Array(decryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
