import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const FREE_MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export async function POST(req: NextRequest) {
  try {
    if (!process.env.CLOUDFLARE_R2_ENDPOINT) {
      return NextResponse.json({ error: 'Cloudflare R2 is not configured.' }, { status: 500 });
    }

    const { fileName, fileSize, userId, totalSize, isManifest, expiryHours, isBurnAfterReading } = await req.json();

    if (!fileName || !fileSize) {
      return NextResponse.json({ error: 'Missing fileName or fileSize' }, { status: 400 });
    }

    const actualSize = isManifest ? totalSize : fileSize;
    let deductCredits = 0;
    
    if (actualSize > FREE_MAX_FILE_SIZE) {
        if (!userId) {
            return NextResponse.json({ 
                error: 'Login required! For files larger than 500MB, please sign in to use your Credits, or use the free Live P2P option.' 
            }, { status: 401 });
        }

        const excessBytes = actualSize - FREE_MAX_FILE_SIZE;
        const excessMB = Math.ceil(excessBytes / (1024 * 1024));
        let baseCredits = Math.ceil(excessMB / 100); 

        if (isManifest && expiryHours) {
            if (expiryHours <= 1) deductCredits = Math.ceil(baseCredits * 0.5);
            else if (expiryHours >= 168) deductCredits = Math.ceil(baseCredits * 2);
            else deductCredits = baseCredits;
        } else {
            deductCredits = baseCredits;
        }
        
        const { data: userData, error } = await supabase
            .from('users_credits')
            .select('credits')
            .eq('user_id', userId)
            .single();
            
        const currentCredits = userData ? Number(userData.credits) : 0;
        
        if (currentCredits < deductCredits) {
             return NextResponse.json({ 
                error: `Not enough credits! You need ${deductCredits} credits for this configuration. Please top-up via PayPal.` 
            }, { status: 402 });
        }
    }

    // 2. Generate Presigned URL
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET || 'nodeferry-shares';
    const objectKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });

    // 3. Deduct Credits & Save Link
    const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://${bucketName}.r2.cloudflarestorage.com`;
    const downloadUrl = `${publicBaseUrl}/${objectKey}`;
    
    let linkId = null;

    if (isManifest) {
        if (deductCredits > 0 && userId) {
            const { data: uData } = await supabase.from('users_credits').select('credits').eq('user_id', userId).single();
            const newBalance = (uData?.credits || 0) - deductCredits;
            
            await supabase
                .from('users_credits')
                .update({ credits: newBalance })
                .eq('user_id', userId);
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (expiryHours || 72));

        const { data: linkData, error: linkErr } = await supabase.from('cloud_links').insert({
            user_id: userId || null,
            manifest_url: downloadUrl,
            is_burn_after_reading: isBurnAfterReading || false,
            expires_at: expiresAt.toISOString(),
            downloads_allowed: 1
        }).select('id').single();

        if (linkData) linkId = linkData.id;
    }

    return NextResponse.json({ uploadUrl, downloadUrl, linkId });

  } catch (err: any) {
    console.error("Presigned URL error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
