import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-page-bg text-text-primary overflow-hidden">
            <div className="relative w-48 h-48 md:w-64 md:h-64 mb-8 -mt-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light shadow-2xl shadow-primary/30 border border-gold/15">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
            </div>

            <h1 className="text-7xl md:text-8xl font-serif font-black mb-2 text-gold-soft tracking-tight">
                404
            </h1>

                <h2 className="text-lg md:text-xl mb-3 font-serif text-text-secondary">
                    Oops! This path has faded away
                </h2>

            <p className="text-sm text-text-muted mb-8 text-center max-w-sm leading-relaxed">
                Sorry, the page you're looking for can't be loaded right now. It may have been moved, removed, or perhaps it never existed.
            </p>

            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-[#E8D8B9] font-medium hover:bg-primary-light transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/10"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Back to Dashboard
            </Link>

            {/* Ornamental divider */}
            <div className="mt-12 flex items-center gap-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold/40" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gold/40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 7.5c0 3.13 2.87 6 6 6h1V11h-1c-2.07 0-4-1.79-4-3.5C9 5.79 10.93 4 13 4h1V2h-1C9.87 2 7 4.37 7 7.5z" />
                    <path d="M17 2v2h-1c-2.07 0-4 1.79-4 3.5 0 1.71 1.93 3.5 4 3.5h1v2h-1c-3.13 0-6-2.87-6-6 0-3.13 2.87-5.5 6-5.5h1z" opacity="0.4" />
                </svg>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold/40" />
            </div>
        </div>
    );
}
