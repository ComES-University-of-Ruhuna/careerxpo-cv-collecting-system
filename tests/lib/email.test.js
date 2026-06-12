const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

import { sendBidConfirmationEmail } from '@/lib/email';

describe('Email Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
  });

  describe('sendBidConfirmationEmail', () => {
    const emailData = {
      to: 'student@example.com',
      studentName: 'John Doe',
      jobTitle: 'Software Engineer',
      companyName: 'Tech Corp',
      creditsSpent: 10,
      remainingCredits: 90,
      cvUrl: 'https://drive.google.com/file/abc',
    };

    it('should skip sending when SMTP_HOST is not configured', async () => {
      delete process.env.SMTP_HOST;
      await sendBidConfirmationEmail(emailData);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should send email when SMTP is configured', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'user@test.com';

      // Re-import to pick up env changes - but since the module is already loaded,
      // we need to test with the existing transporter. The guard check is on SMTP_HOST.
      // Since we set it, the function should call sendMail.
      await sendBidConfirmationEmail(emailData);
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('student@example.com');
      expect(callArgs.subject).toContain('Software Engineer');
      expect(callArgs.subject).toContain('Tech Corp');
      expect(callArgs.html).toContain('John Doe');
      expect(callArgs.html).toContain('Software Engineer');
      expect(callArgs.html).toContain('Tech Corp');
      expect(callArgs.html).toContain('10');
      expect(callArgs.html).toContain('90');
      expect(callArgs.html).toContain('https://drive.google.com/file/abc');
    });

    it('should include CV link when provided', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      await sendBidConfirmationEmail(emailData);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('View your submitted CV');
    });

    it('should omit CV link when not provided', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      await sendBidConfirmationEmail({ ...emailData, cvUrl: null });
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).not.toContain('View your submitted CV');
    });
  });
});
