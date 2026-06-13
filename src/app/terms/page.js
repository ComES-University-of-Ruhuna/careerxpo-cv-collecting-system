import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - CareerXpo 3.0',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-primary-600 hover:text-primary-800 font-bold text-lg">← CareerXpo 3.0</Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">1. Acceptance of Terms</h2>
            <p className="text-gray-600">By accessing and using CareerXpo 3.0, you agree to be bound by these Terms of Service. This platform is provided by the IEEE Student Branch, University of Ruhuna, Faculty of Engineering for the purpose of facilitating career fair activities.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">2. Eligibility</h2>
            <p className="text-gray-600">This platform is intended for students of the Faculty of Engineering, University of Ruhuna. You must use a valid university Google account to sign in. By registering, you confirm that you are a current student of the university.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">3. User Accounts</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>You are responsible for maintaining the security of your account.</li>
              <li>You must provide accurate registration information (registration number and department).</li>
              <li>Each student is allowed one account only.</li>
              <li>Sharing accounts or credentials is prohibited.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">4. Credit System &amp; Bidding</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Each student receives a fixed allocation of credits for bidding on job positions.</li>
              <li>Credits spent on bids are non-refundable once a bid is placed.</li>
              <li>Bids are processed on a first-come-first-served basis, subject to position limits.</li>
              <li>The administrators reserve the right to adjust credit allocations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">5. CV Upload</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>You may upload your CV in PDF format only.</li>
              <li>CVs must contain accurate and truthful information.</li>
              <li>Uploaded CVs will be shared with companies for positions you bid on.</li>
              <li>You are responsible for the content of your uploaded documents.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">6. Prohibited Conduct</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Attempting to manipulate the bidding system or exploit vulnerabilities.</li>
              <li>Creating multiple accounts or impersonating another student.</li>
              <li>Uploading malicious files or inappropriate content.</li>
              <li>Interfering with the platform&apos;s operation or other users&apos; access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">7. Disclaimer</h2>
            <p className="text-gray-600">This platform is provided &quot;as is&quot; for career fair purposes. The organizers do not guarantee employment outcomes. The platform facilitates connections between students and companies but does not guarantee job offers or interviews.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">8. Modifications</h2>
            <p className="text-gray-600">The organizers reserve the right to modify these terms, the credit system, or platform features at any time. Users will be notified of significant changes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">9. Contact</h2>
            <p className="text-gray-600">For questions about these terms, contact us at <a href="mailto:info.careerxpo@gmail.com" className="text-primary-600 hover:underline">info.careerxpo@gmail.com</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
