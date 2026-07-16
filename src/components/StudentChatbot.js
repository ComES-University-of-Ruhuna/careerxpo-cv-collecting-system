'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  HiChat,
  HiX,
  HiChevronLeft,
  HiChevronRight,
  HiHome,
  HiExternalLink,
} from 'react-icons/hi';

// Rule-based help tree. Each node can either have `children` (branch) or
// `answer` (leaf). Leaves may include an optional `link` for a CTA.
const MENU = [
  {
    id: 'payment',
    label: 'Registration Fee & Payments',
    children: [
      {
        id: 'p-how-pay',
        label: 'How do I pay the registration fee?',
        answer:
          'The one-time registration fee is LKR 500. Deposit it to the bank account (details are on your Profile page) and use your registration number as the payment reference.',
        link: { href: '/student/profile', label: 'Open Profile' },
      },
      {
        id: 'p-submit-slip',
        label: 'How do I submit my bank slip?',
        answer:
          'Go to Profile → Registration Fee → Submit Bank Slip. Upload a PDF or image of your deposit receipt (max 5MB) and fill in the payment details.',
        link: { href: '/student/profile', label: 'Open Profile' },
      },
      {
        id: 'p-bank-details',
        label: 'What are the bank details?',
        answer:
          'Peoples bank · Kegalle Branch · Account: K.P.N. Deshapriya · A/C No: 027200160042754.',
      },
      {
        id: 'p-status',
        label: 'How do I check my payment status?',
        answer:
          'Your submitted slip status (pending / verified / rejected) is shown on the Profile page under Registration Fee.',
        link: { href: '/student/profile', label: 'Open Profile' },
      },
      {
        id: 'p-slip-vs-ref',
        label: 'What is the difference between Slip No. and Reference No.?',
        answer:
          'Slip No. is the number printed on your bank receipt by the bank. Reference No. is what you (or the bank) wrote as the payment reference — usually your registration number.',
      },
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    children: [
      {
        id: 'pr-complete',
        label: 'How do I complete my profile?',
        answer:
          'Fill in: registration number (EG/20XX/XXXX), full name, department, sub-specialization (if your department has any), and accept the CV sharing consent.',
        link: { href: '/student/profile', label: 'Open Profile' },
      },
      {
        id: 'pr-cv',
        label: 'How do I upload my CV?',
        answer:
          'On the Profile page, choose a PDF file (max 5MB) under the CV section. Only PDF files are accepted.',
        link: { href: '/student/profile', label: 'Open Profile' },
      },
      {
        id: 'pr-consent',
        label: 'What is CV sharing consent?',
        answer:
          'You must consent before your CV can be shared with companies you bid on. Without consent, your profile stays inactive and you cannot bid.',
      },
      {
        id: 'pr-regno',
        label: 'What is the registration number format?',
        answer: 'EG/20XX/XXXX — for example EG/2021/1234. Slashes are inserted automatically as you type.',
      },
    ],
  },
  {
    id: 'companies',
    label: 'Companies & Bidding',
    children: [
      {
        id: 'c-how-bid',
        label: 'How does bidding work?',
        answer:
          'Browse companies, spend credits to place a bid, and if you are selected your CV is shared with the company.',
        link: { href: '/student/companies', label: 'Browse Companies' },
      },
      
      {
        id: 'c-credits',
        label: 'How do credits work?',
        answer:
          'Every student starts with 100 credits. Placing a bid spends credits. Remaining credits are shown on the Dashboard.',
        link: { href: '/student', label: 'Open Dashboard' },
      },
    ],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Jobs',
    children: [
      {
        id: 'l-browse',
        label: 'How do I browse LinkedIn jobs?',
        answer:
          'Open the LinkedIn Jobs section from the sidebar to view curated postings you can apply to directly on LinkedIn.',
        link: { href: '/student/linkedin-jobs', label: 'Open LinkedIn Jobs' },
      },
    ],
  },
  {
    id: 'support',
    label: 'Policies & Support',
    children: [
      {
        id: 's-privacy',
        label: 'Privacy Policy',
        answer: 'Read how we handle your personal data and CV.',
        link: { href: '/privacy', label: 'View Privacy Policy' },
      },
      {
        id: 's-terms',
        label: 'Terms of Service',
        answer: 'Review the terms that apply to your use of CareerXpo.',
        link: { href: '/terms', label: 'View Terms' },
      },
    ],
  },
];

// Walk `MENU` following an array of ids. Returns { node, parentChildren }.
function resolvePath(path) {
  let children = MENU;
  let node = null;
  for (const id of path) {
    const found = children.find((n) => n.id === id);
    if (!found) return { node: null, parentChildren: MENU };
    node = found;
    children = found.children || [];
  }
  return { node, parentChildren: children };
}

export default function StudentChatbot() {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState([]); // stack of node ids from root
  const panelRef = useRef(null);

  const { node, parentChildren } = useMemo(() => resolvePath(path), [path]);
  const isLeaf = !!(node && node.answer && !node.children);
  const breadcrumb = useMemo(() => {
    const labels = [];
    let children = MENU;
    for (const id of path) {
      const n = children.find((c) => c.id === id);
      if (!n) break;
      labels.push(n.label);
      children = n.children || [];
    }
    return labels;
  }, [path]);

  // Close panel on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function goHome() {
    setPath([]);
  }
  function goBack() {
    setPath((p) => p.slice(0, -1));
  }
  function goInto(id) {
    setPath((p) => [...p, id]);
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close help chat' : 'Open help chat'}
        aria-expanded={open}
        className="fixed z-40 bottom-5 right-5 sm:bottom-6 sm:right-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition"
      >
        {open ? <HiX className="text-2xl" /> : <HiChat className="text-2xl" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Help chat"
          className="fixed z-40 bottom-24 right-4 sm:right-6 w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">CareerXpo Help</p>
              <p className="text-xs text-primary-100 truncate">
                {breadcrumb.length === 0 ? 'Pick a topic below' : breadcrumb.join(' › ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="p-1 rounded hover:bg-white/10"
            >
              <HiX className="text-lg" />
            </button>
          </div>

          {/* Nav row */}
          {path.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-primary-600"
              >
                <HiChevronLeft /> Back
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={goHome}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-primary-600"
              >
                <HiHome /> Home
              </button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3">
            {breadcrumb.length === 0 && (
              <div className="bg-primary-50 border border-primary-100 text-primary-800 text-sm rounded-lg p-3 mb-3">
                Hi! I&apos;m the CareerXpo help bot. Choose a topic to get started.
              </div>
            )}

            {isLeaf ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-800 whitespace-pre-line">{node.answer}</p>
                {node.link && (
                  <Link
                    href={node.link.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
                  >
                    {node.link.label} <HiExternalLink className="text-xs" />
                  </Link>
                )}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {(node ? node.children : parentChildren).map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      onClick={() => goInto(child.id)}
                      className="w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition"
                    >
                      <span className="text-sm text-gray-800">{child.label}</span>
                      <HiChevronRight className="text-gray-400 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500 text-center">
            Automated guide · not a live agent
          </div>
        </div>
      )}
    </>
  );
}
