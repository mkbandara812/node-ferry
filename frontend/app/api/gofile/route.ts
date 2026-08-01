import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch('https://api.gofile.io/servers', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            // next: { revalidate: 3600 } // cache for 1 hour to avoid rate limits
        });
        
        if (!response.ok) {
            throw new Error(`Gofile API returned ${response.status}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
