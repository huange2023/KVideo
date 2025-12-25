/**
 * Config API Route
 * Exposes configuration status (never actual values) to the client
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
    const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || '';
    const SUBSCRIPTION_SOURCES = process.env.SUBSCRIPTION_SOURCES || process.env.NEXT_PUBLIC_SUBSCRIPTION_SOURCES || '';

    return NextResponse.json({
        hasEnvPassword: ACCESS_PASSWORD.length > 0,
        subscriptionSources: SUBSCRIPTION_SOURCES,
    });
}

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();
        const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || '';

        if (!ACCESS_PASSWORD) {
            return NextResponse.json({ valid: false, message: 'No env password set' });
        }

        const valid = password === ACCESS_PASSWORD;
        return NextResponse.json({ valid });
    } catch {
        return NextResponse.json({ valid: false, message: 'Invalid request' }, { status: 400 });
    }
}
