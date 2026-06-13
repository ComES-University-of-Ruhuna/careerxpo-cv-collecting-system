import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata = {
  title: 'CareerXpo 3.0 - University of Ruhuna',
  description: 'Career Fair CV Collection and Bidding System',
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-right" />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
