import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get PayPal Access Token
async function getPayPalAccessToken() {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET; // This should be added to .env.local

    if (!clientId || !secret) {
        throw new Error('PayPal credentials missing');
    }

    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
    
    // Use sandbox url for 'test' or production for real.
    const url = clientId === 'test' || clientId.includes('sandbox') 
        ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token'
        : 'https://api-m.paypal.com/v1/oauth2/token';

    const response = await fetch(url, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    const data = await response.json();
    return data.access_token;
}

export async function POST(req: NextRequest) {
    try {
        const { orderID, creditsToGive, userId } = await req.json();

        if (!orderID || !creditsToGive || !userId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Verify Payment with PayPal
        let paymentVerified = false;
        
        // If they haven't set up the secret yet, we will simulate success for development
        if (!process.env.PAYPAL_SECRET) {
            console.log("PAYPAL_SECRET not found. Simulating payment success for development.");
            paymentVerified = true;
        } else {
            const accessToken = await getPayPalAccessToken();
            
            const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
            const url = clientId === 'test' || clientId.includes('sandbox') 
                ? `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}`
                : `https://api-m.paypal.com/v2/checkout/orders/${orderID}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const orderData = await response.json();
            
            // Ensure order is completed/approved
            if (orderData.status === 'COMPLETED' || orderData.status === 'APPROVED') {
                paymentVerified = true;
            }
        }

        if (!paymentVerified) {
            return NextResponse.json({ error: 'Payment not verified or not completed' }, { status: 400 });
        }

        // 2. Add Credits to User in Supabase
        const { data: userData } = await supabase
            .from('users_credits')
            .select('credits')
            .eq('user_id', userId)
            .single();

        const currentCredits = userData ? Number(userData.credits) : 0;
        const newTotal = currentCredits + creditsToGive;

        if (userData) {
            await supabase
                .from('users_credits')
                .update({ credits: newTotal })
                .eq('user_id', userId);
        } else {
            await supabase
                .from('users_credits')
                .insert([{ user_id: userId, credits: newTotal }]);
        }

        return NextResponse.json({ success: true, newTotal });

    } catch (error: any) {
        console.error("PayPal Capture Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
