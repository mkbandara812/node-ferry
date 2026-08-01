import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Missing link ID' }, { status: 400 });

        // Fetch link data
        const { data: linkData, error } = await supabase
            .from('cloud_links')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !linkData) {
            return NextResponse.json({ error: 'Link not found or expired.' }, { status: 404 });
        }

        // Check Expiry
        if (new Date(linkData.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This link has expired.' }, { status: 410 });
        }

        // Check Burn After Reading
        if (linkData.is_burn_after_reading && linkData.downloads_count >= linkData.downloads_allowed) {
            return NextResponse.json({ error: 'This file was set to "Burn After Reading" and has already been downloaded.' }, { status: 410 });
        }

        // Increment Download Count
        await supabase
            .from('cloud_links')
            .update({ downloads_count: linkData.downloads_count + 1 })
            .eq('id', id);

        // Fetch Custom Branding if user_id exists
        let branding = null;
        if (linkData.user_id) {
            const { data: settingsData } = await supabase
                .from('user_settings')
                .select('brand_name, brand_logo_url')
                .eq('user_id', linkData.user_id)
                .single();
                
            if (settingsData) branding = settingsData;
        }

        return NextResponse.json({ 
            manifest_url: linkData.manifest_url,
            branding
        });

    } catch (err: any) {
        console.error("Link API Error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
