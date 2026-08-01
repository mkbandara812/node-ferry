import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Must use service role to update credits
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
    try {
        const { userId, referredByCode } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Check if user already has a credits record
        const { data: existingUser } = await supabase
            .from('users_credits')
            .select('user_id')
            .eq('user_id', userId)
            .single();

        if (existingUser) {
            return NextResponse.json({ success: true, message: 'User already initialized.' });
        }

        // Generate a unique referral code
        const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        let referrerId = null;
        let initialCredits = 0;

        // Process Referral
        if (referredByCode) {
            const { data: referrerData } = await supabase
                .from('users_credits')
                .select('user_id, credits')
                .eq('referral_code', referredByCode.toUpperCase())
                .single();

            if (referrerData) {
                referrerId = referrerData.user_id;
                initialCredits = 25; // Give new user 25 bonus credits

                // Give referrer 50 bonus credits
                await supabase
                    .from('users_credits')
                    .update({ credits: referrerData.credits + 50 })
                    .eq('user_id', referrerId);

                // Add to referral_history
                await supabase
                    .from('referral_history')
                    .insert({ referrer_id: referrerId, referred_id: userId });
            }
        }

        // Initialize user record
        const { error: insertError } = await supabase
            .from('users_credits')
            .insert({
                user_id: userId,
                credits: initialCredits,
                referral_code: newReferralCode,
                referred_by: referrerId
            });

        if (insertError) {
            console.error('Failed to initialize user:', insertError);
            return NextResponse.json({ error: 'Failed to initialize user.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, referralCode: newReferralCode });

    } catch (err: any) {
        console.error("User Init API Error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
