import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-6 text-center text-sm text-gray-500 space-y-1">
      <p>Organized by <span className="font-semibold text-gray-700">IEEE Student Branch, University of Ruhuna</span></p>
      <p className="text-xs">In collaboration with EIES, CEES, ComES, MMESS &amp; SSMENA</p>
      <p className="text-xs">Platform powered by <span className="font-semibold text-gray-600">Computer Engineering Society (ComES)</span></p>
      <p className="text-xs mt-2">
        <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
        {' · '}
        <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
      </p>
    </footer>
  );
}
