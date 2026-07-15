import { google } from 'googleapis';
import { Readable } from 'stream';

let driveClient = null;

function getDrive() {
  if (driveClient) return driveClient;

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Google Drive OAuth2 credentials not set. ' +
      'Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN in .env.local. ' +
      'Run: node scripts/get-drive-token.js'
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  return driveClient;
}

async function getOrCreateFolder(drive, folderName, parentFolderId) {
  // Sanitize folder name to prevent query injection
  const safeFolderName = folderName.replace(/'/g, "\\'");
  // Check if folder already exists
  const existing = await drive.files.list({
    q: `name='${safeFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  if (existing.data.files?.length > 0) {
    return existing.data.files[0].id;
  }

  // Create the folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  return folder.data.id;
}

export async function uploadCVToDrive(fileBuffer, registrationNo, studentName, companyName, jobTitle) {
  const drive = getDrive();

  const safeName = studentName.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  const safeRegNo = registrationNo.replace(/\//g, '_');
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  let targetFolderId;
  let fileName;

  if (companyName) {
    const safeCompany = companyName.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
    const companyFolderId = await getOrCreateFolder(drive, safeCompany, rootFolderId);

    if (jobTitle) {
      const safeJob = jobTitle.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
      targetFolderId = await getOrCreateFolder(drive, safeJob, companyFolderId);
      fileName = `Resume_${safeName}_${safeCompany}_${safeJob}_${safeRegNo}.pdf`;
    } else {
      targetFolderId = companyFolderId;
      fileName = `Resume_${safeName}_${safeCompany}_${safeRegNo}.pdf`;
    }
  } else {
    fileName = `Resume_${safeName}_Basic_${safeRegNo}.pdf`;
    targetFolderId = await getOrCreateFolder(drive, 'Basic_Resumes', rootFolderId);
  }

  // Check if file already exists and delete it
  const existing = await drive.files.list({
    q: `name='${fileName}' and '${targetFolderId}' in parents and trashed=false`,
    fields: 'files(id)',
  });

  for (const file of existing.data.files || []) {
    await drive.files.delete({ fileId: file.id });
  }

  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'application/pdf',
      parents: [targetFolderId],
    },
    media: {
      mimeType: 'application/pdf',
      body: stream,
    },
    fields: 'id, webViewLink',
  });

  // Make the file readable by anyone with the link
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  const file = await drive.files.get({
    fileId: response.data.id,
    fields: 'id, webViewLink',
  });

  return {
    fileId: file.data.id,
    webViewLink: file.data.webViewLink,
  };
}

const PAYMENT_SLIPS_FOLDER_NAME = 'Payment_Slips';
const ALLOWED_SLIP_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const MIME_EXTENSIONS = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Upload a registration-fee bank slip for a student. The file is stored
 * inside a `Payment_Slips` folder under the configured root drive folder
 * and named using the student's registration number.
 */
export async function uploadPaymentSlipToDrive(fileBuffer, registrationNo, mimeType) {
  if (!ALLOWED_SLIP_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported file type. Please upload a PDF or image (JPG/PNG/WEBP).');
  }

  const drive = getDrive();
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured.');
  }

  const safeRegNo = registrationNo.replace(/\//g, '_');
  const ext = MIME_EXTENSIONS[mimeType];
  const fileName = `PaymentSlip_${safeRegNo}.${ext}`;

  const targetFolderId = await getOrCreateFolder(drive, PAYMENT_SLIPS_FOLDER_NAME, rootFolderId);

  // Remove any prior slip for this registration number (across extensions)
  // so re-uploads replace the previous file cleanly.
  const safePrefix = `PaymentSlip_${safeRegNo}`.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `name contains '${safePrefix}' and '${targetFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
  });
  for (const file of existing.data.files || []) {
    if (file.name === fileName || file.name.startsWith(`${safePrefix}.`)) {
      try {
        await drive.files.delete({ fileId: file.id });
      } catch {
        // Ignore delete failures — proceed to upload the new copy.
      }
    }
  }

  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
      parents: [targetFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  });

  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  const file = await drive.files.get({
    fileId: response.data.id,
    fields: 'id, webViewLink',
  });

  return {
    fileId: file.data.id,
    webViewLink: file.data.webViewLink,
    fileName,
  };
}

export async function getJobFolderLink(companyName, jobTitle) {
  const drive = getDrive();
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const safeCompany = companyName.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  const safeFolderName = safeCompany.replace(/'/g, "\\'");

  // Find company folder
  const companyResult = await drive.files.list({
    q: `name='${safeFolderName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, webViewLink)',
  });

  if (!companyResult.data.files?.length) {
    return null;
  }

  const companyFolderId = companyResult.data.files[0].id;

  if (!jobTitle) {
    return `https://drive.google.com/drive/folders/${companyFolderId}`;
  }

  const safeJob = jobTitle.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  const safeJobName = safeJob.replace(/'/g, "\\'");

  const jobResult = await drive.files.list({
    q: `name='${safeJobName}' and '${companyFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  if (!jobResult.data.files?.length) {
    return null;
  }

  return `https://drive.google.com/drive/folders/${jobResult.data.files[0].id}`;
}
