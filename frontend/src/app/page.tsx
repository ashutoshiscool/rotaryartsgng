import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-white text-gray-900 p-6">
      <div className="max-w-3xl w-full space-y-6 sm:space-y-8 text-center bg-white/60 backdrop-blur-xl p-6 sm:p-12 rounded-3xl shadow-2xl border border-white/40">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">
          Rotary Arts Platform
        </h1>
        <p className="text-base sm:text-xl text-gray-600 font-medium leading-relaxed">
          The comprehensive, production-ready SaaS for managing artists, bookings, and complex events.
        </p>

        <div className="pt-4 sm:pt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-6">
          <Link
            href="/system-check"
            className="px-6 sm:px-8 py-3 sm:py-4 bg-black text-white rounded-full font-semibold shadow-xl shadow-black/20 hover:scale-105 transition-transform duration-300 text-center text-sm sm:text-base"
          >
            Run System Validator
          </Link>
          <Link
            href="/login"
            className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-black border border-gray-200 rounded-full font-semibold shadow-lg hover:bg-gray-50 transition-colors inline-block text-center text-sm sm:text-base"
          >
            Login to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
