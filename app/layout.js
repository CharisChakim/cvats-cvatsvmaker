import Header from '@/components/Header';

import './globals.scss';
import ReduxProvider from '@/store/ReduxProvider';
import {GoogleAnalytics} from '@next/third-parties/google'

export const metadata = {
    metadataBase: 'http://cvats.vercel.app',
    title: 'C-VATS — Get past the résumé screener',
    description:
        'C-VATS scores your résumé against the job you actually want, shows you the exact gaps, and rewrites them with you. No login. Export a clean ATS-safe PDF in seconds.',
    // No `icons` entry: app/icon.svg is picked up by Next's file convention, which
    // takes precedence over this field anyway. The old app/favicon.ico silently won
    // over the configured SVG, which is why the tab kept showing the stale mark.
    openGraph: {
        title: 'C-VATS',
        images: `/banner.png`,
        type: 'website',
    },
    alternates: {
        canonical: '/',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                {/* Prevent flash of wrong theme before React hydrates */}
                <script dangerouslySetInnerHTML={{ __html: `(function(){if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');})();` }} />
                <ReduxProvider>
                    <Header />
                    <div className="mx-auto  min-h-[calc(100vh-3rem)]">{children}</div>
                </ReduxProvider>
                <GoogleAnalytics gaId='G-WPXWXJ9MC2' />
            </body>
        </html>
    );
}
