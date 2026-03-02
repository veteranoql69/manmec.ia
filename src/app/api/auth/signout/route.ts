import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Check if we have a session
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (session) {
            await supabase.auth.signOut();
        }

        // Determine the redirect URL
        // Default to origin/login if referer is not available or if it's the signout page itself
        const redirectUrl = new URL('/login', req.url);

        revalidatePath('/', 'layout');

        return NextResponse.redirect(redirectUrl, {
            status: 302,
        });
    } catch (error) {
        console.error('Error in signout route:', error);
        return NextResponse.redirect(new URL('/login', req.url), {
            status: 302,
        });
    }
}
