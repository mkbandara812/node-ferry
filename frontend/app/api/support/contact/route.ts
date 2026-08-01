import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
        const { email, message } = await req.json();

        if (!email || !message) {
            return NextResponse.json({ error: 'Email and message are required' }, { status: 400 });
        }

        // Configure Nodemailer transporter
        // You will need to add these environment variables in Vercel / .env.local
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.hostinger.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER || 'support@nodeferry.com',
                pass: process.env.SMTP_PASS || '', 
            },
        });

        // Email content
        const mailOptions = {
            from: process.env.SMTP_USER || 'support@nodeferry.com',
            to: 'support@nodeferry.com', // Send to yourself
            subject: `New Support Request from ${email}`,
            text: `You have received a new support message from: ${email}\n\nMessage:\n${message}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>New Support Request</h2>
                    <p><strong>From:</strong> ${email}</p>
                    <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin-top: 10px;">
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                </div>
            `,
        };

        // If SMTP password is not set, we just simulate success so the UI doesn't crash during development
        if (!process.env.SMTP_PASS) {
            console.warn("SMTP_PASS is not set in environment variables. Simulating email send.");
            return NextResponse.json({ success: true, simulated: true });
        }

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Support API Error:", error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
