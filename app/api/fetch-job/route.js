import { NextResponse } from 'next/server';
import { checkRateLimit, clientIp, rateLimitedResponse } from '@/lib/rateLimit';

export async function POST(req) {
    try {
        // No AI cost here, but it's still an unauthenticated arbitrary-URL
        // fetcher — worth capping so it can't be used as an open proxy.
        const rl = checkRateLimit(`fetch-job:${clientIp(req)}`, { limit: 15, windowMs: 10 * 60 * 1000 });
        if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

        const { url } = await req.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 });
        }

        const res = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(12000),
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Could not fetch the page (HTTP ${res.status}). The site may require login.` },
                { status: 502 },
            );
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
            return NextResponse.json({ error: 'URL does not point to a readable page' }, { status: 400 });
        }

        const html = await res.text();

        const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
            .replace(/<header[\s\S]*?<\/header>/gi, ' ')
            .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
            .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s{2,}/g, ' ')
            .trim()
            .slice(0, 12000);

        if (!text || text.length < 100) {
            return NextResponse.json(
                { error: 'Could not extract readable text from this page. Please paste the text manually.' },
                { status: 400 },
            );
        }

        return NextResponse.json({ text });
    } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return NextResponse.json({ error: 'Request timed out. Please paste the job text manually.' }, { status: 504 });
        }
        console.error('fetch-job error:', error);
        return NextResponse.json({ error: 'Failed to fetch job posting' }, { status: 500 });
    }
}
