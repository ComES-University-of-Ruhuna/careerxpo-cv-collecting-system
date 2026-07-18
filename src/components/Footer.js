import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-6 px-4 sm:px-6 text-center text-sm text-gray-500 space-y-1">
      <p>Organized by <span className="font-semibold text-gray-700">Faculty of Engineering, University of Ruhuna</span></p>
      <p className="text-xs">In collaboration with CGU, EIES, CEES, ComES, MMESS, SSMENA &amp; IEEE</p>
      <p className="text-xs">Platform powered by <span className="font-semibold text-gray-600">Computer Engineering Society (ComES)</span></p>
      <p className="text-xs mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
        <span aria-hidden="true">·</span>
        <Link href="https://www.linkedin.com/in/kavishkakalhara/" className="text-primary-600 hover:underline">Developer</Link>
      </p>
    </footer>
  );
}
