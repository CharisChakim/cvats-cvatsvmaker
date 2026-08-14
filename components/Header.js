'use client';

import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import LangToggle from './LangToggle';
import Logo from './Logo';
const Header = () => {
    return (
        <header className="sticky top-0 z-40 glass border-x-0 border-t-0">
            <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3 2xl:max-w-screen-2xl">
                <Link
                    href="/"
                    aria-label="C-VATS home"
                    className="flex items-center gap-2 shrink-0 transition-transform duration-300 ease-spring hover:scale-[1.02] active:scale-95"
                >
                    <Logo size={30} className="text-ink" />
                    <span className="text-[1.35rem] font-semibold tracking-[-0.03em] text-ink">
                        C<span className="text-primary-400">-</span>VATS
                    </span>
                </Link>

                <nav className="flex items-center gap-2">
                    <LangToggle />
                    <ThemeToggle />
                </nav>
            </div>
        </header>
    );
};

export default Header;
