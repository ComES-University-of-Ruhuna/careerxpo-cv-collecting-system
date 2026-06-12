import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'CareerXpo 3.0 - University of Ruhuna',
  description: 'Career Fair CV Collection and Bidding System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
