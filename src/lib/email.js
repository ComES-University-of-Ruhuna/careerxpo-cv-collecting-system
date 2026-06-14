import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER;

/**
 * Send a confirmation email after a student bids on a job.
 */
export async function sendBidConfirmationEmail({ to, studentName, jobTitle, companyName, creditsSpent, remainingCredits, cvUrl }) {
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP not configured — skipping bid confirmation email');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">CareerXpo</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">Faculty of Engineering, University of Ruhuna</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1e40af; margin-top: 0;">Application Submitted Successfully!</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>Your CV has been successfully submitted for the following position:</p>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Position</td>
              <td style="padding: 8px 0; font-weight: bold;">${jobTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Company</td>
              <td style="padding: 8px 0; font-weight: bold;">${companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Credits Used</td>
              <td style="padding: 8px 0; font-weight: bold;">${creditsSpent}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Remaining Credits</td>
              <td style="padding: 8px 0; font-weight: bold;">${remainingCredits}</td>
            </tr>
          </table>
        </div>
        ${cvUrl ? `<p><a href="${cvUrl}" style="color: #1e40af;">View your submitted CV</a></p>` : ''}
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          This is an automated confirmation. If you did not submit this application, please contact the Career Fair organizers immediately.
        </p>
      </div>
      <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
        &copy; ${new Date().getFullYear()} CareerXpo — Career Fair CV Collection &amp; Bidding System
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"CareerXpo" <${FROM_ADDRESS}>`,
    to,
    subject: `Application Received — ${jobTitle} at ${companyName}`,
    html,
  });
}

/**
 * Send job alert emails to students in relevant departments.
 */
export async function sendJobAlertEmails({ recipients, jobTitle, companyName, creditCost, deadline, departments }) {
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP not configured — skipping job alert emails');
    return;
  }

  const deptText = departments?.length > 0 ? departments.join(', ') : 'All Departments';
  const deadlineText = deadline
    ? new Date(deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'No deadline';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">CareerXpo</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">Faculty of Engineering, University of Ruhuna</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1e40af; margin-top: 0;">🚀 New Job Opportunity!</h2>
        <p>A new position has been published that matches your department:</p>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Position</td>
              <td style="padding: 8px 0; font-weight: bold;">${jobTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Company</td>
              <td style="padding: 8px 0; font-weight: bold;">${companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Credit Cost</td>
              <td style="padding: 8px 0; font-weight: bold;">${creditCost}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Departments</td>
              <td style="padding: 8px 0; font-weight: bold;">${deptText}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Deadline</td>
              <td style="padding: 8px 0; font-weight: bold;">${deadlineText}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://careerxpo.comesuor.lk'}/student/companies" style="display: inline-block; background: #1e40af; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View & Apply Now
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Log in to CareerXpo to upload your CV and bid on this position. Don't miss out!
        </p>
      </div>
      <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
        &copy; ${new Date().getFullYear()} CareerXpo — Career Fair CV Collection &amp; Bidding System
      </div>
    </div>
  `;

  const transport = getTransporter();
  const BATCH_SIZE = 50;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map((email) =>
        transport.sendMail({
          from: `"CareerXpo" <${FROM_ADDRESS}>`,
          to: email,
          subject: `New Job: ${jobTitle} at ${companyName}`,
          html,
        })
      )
    );
  }
}
