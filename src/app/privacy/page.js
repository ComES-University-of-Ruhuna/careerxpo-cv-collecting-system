import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - CareerXpo 3.0',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-primary-600 hover:text-primary-800 font-bold text-lg">← CareerXpo 3.0</Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">1. Introduction</h2>
            <p className="text-gray-600">CareerXpo 3.0 is a career fair CV collection and bidding platform operated by the IEEE Student Branch, University of Ruhuna, Faculty of Engineering. This policy explains how we collect, use, and protect your personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li><strong>Google Account Data:</strong> When you sign in with Google, we receive your name, email address, and profile picture from your Google account.</li>
              <li><strong>Registration Details:</strong> Your university registration number and department.</li>
              <li><strong>CV/Resume:</strong> PDF documents you upload, stored securely on Google Drive.</li>
              <li><strong>Bidding Activity:</strong> Records of your bids on job positions and credit usage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>To authenticate your identity and manage your account.</li>
              <li>To allow you to upload and manage your CV for the career fair.</li>
              <li>To process your bids on job positions from participating companies.</li>
              <li>To share your CV and profile with companies you bid on.</li>
              <li>To send email notifications about your bids and account activity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">4. Data Sharing</h2>
            <p className="text-gray-600">Your CV and profile information are shared only with companies participating in the career fair for positions you have bid on. We do not sell or share your data with any other third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">5. Data Storage &amp; Security</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Account data is stored in a secure MongoDB database.</li>
              <li>CVs are stored on Google Drive with restricted access.</li>
              <li>Authentication uses secure JWT tokens with httpOnly cookies.</li>
              <li>All connections are encrypted via HTTPS.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">6. Data Retention</h2>
            <p className="text-gray-600">Your data is retained for the duration of the career fair event cycle. After the event concludes, student data may be deleted upon request. Contact the administrators to request data deletion.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">7. Your Rights</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>You can view and update your profile information at any time.</li>
              <li>You can request deletion of your account and associated data.</li>
              <li>You can revoke Google account access through your Google Account settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">8. Contact</h2>
            <p className="text-gray-600">For privacy-related inquiries, contact us at <a href="mailto:info.careerxpo@gmail.com" className="text-primary-600 hover:underline">info.careerxpo@gmail.com</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
