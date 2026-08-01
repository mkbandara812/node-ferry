export async function getGofileServer(): Promise<string> {
    const res = await fetch('https://api.gofile.io/servers');
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Failed to get Gofile server');
    return data.data.servers[0].name;
}

export async function uploadToCloud(
    file: Blob, 
    fileName: string, 
    onProgress?: (p: number) => void,
    meta?: {
        totalSize?: number;
        isManifest?: boolean;
        expiryHours?: number;
        isBurnAfterReading?: boolean;
        userId?: string;
    }
): Promise<{ downloadUrl: string, linkId?: string }> {
    // 1. Get Presigned URL and Usage Authorization from our Next.js API
    const authRes = await fetch('/api/s3/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            fileName, 
            fileSize: file.size,
            ...meta
        })
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
        throw new Error(authData.error || 'Failed to get upload authorization');
    }

    const { uploadUrl, downloadUrl, linkId } = authData;

    // 2. Upload directly to Cloudflare R2 using the presigned URL
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        
        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    onProgress(progress);
                }
            };
        }
        
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                // Return the public download URL that the recipient will use
                resolve({ downloadUrl, linkId });
            } else {
                reject(new Error('Cloudflare R2 Upload failed with status: ' + xhr.status));
            }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload to R2.'));
        
        xhr.send(file);
    });
}
