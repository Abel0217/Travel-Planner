const path = require('path');
const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');
const CLIENT_ID = '270254942833-92k0ds41tla62fst4me7b73nsps2ioqs.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = `${process.env.SERVER_URL}`;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN; 

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function getEmails(query) {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
    });

    const messages = res.data.messages || [];
    const emails = [];

    for (let message of messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      const emailData = msg.data;
      emails.push(emailData);
    }

    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error.response ? error.response.data : error.message);
    return [];
  }
}

function parseBookingFromEmail(email) {
  const { payload } = email;
  let extractedDetails = {};

  if (payload && payload.headers) {
    const subject = payload.headers.find(header => header.name === 'Subject');
    const from = payload.headers.find(header => header.name === 'From');
    extractedDetails.subject = subject ? subject.value : '';
    extractedDetails.from = from ? from.value : '';
  }

  const body = getBodyFromPayload(payload);
  if (body) {
    if (body.includes('Hotel Reservation')) {
      extractedDetails.type = 'Hotel';
      extractedDetails.details = 'Extracted hotel reservation details here';
    } else if (body.includes('Flight')) {
      extractedDetails.type = 'Flight';
      extractedDetails.details = 'Extracted flight booking details here';
    } else if (body.includes('Restaurant')) {
      extractedDetails.type = 'Restaurant';
      extractedDetails.details = 'Extracted restaurant reservation details here';
    } else if (body.includes('Transport')) {
      extractedDetails.type = 'Transport';
      extractedDetails.details = 'Extracted transport reservation details here';
    }
  }

  return extractedDetails;
}

function getBodyFromPayload(payload) {
  if (!payload) return '';
  let data = '';

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        data += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
        data += Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }

  if (payload.body && payload.body.data) {
    data += Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  return data;
}

let sendWarning = '';
let sendBlocked = false;

async function sendAppEmail({ to, subject, html, text }) {
  if (sendBlocked) return { sent: false, reason: 'blocked' };
  if (!to) return { sent: false, reason: 'missing_recipient' };
  if (!REFRESH_TOKEN) {
    if (sendWarning !== 'missing') {
      sendWarning = 'missing';
      console.warn('Email skipped: Gmail is not connected for sending.');
    }
    return { sent: false, reason: 'not_configured' };
  }

  const logoPath = path.join(__dirname, '../../src/Components/css/Logo.PNG');
  const mail = new MailComposer({
    from: 'Travel Planner',
    to,
    subject,
    text: text || subject,
    html,
    attachments: [{
      filename: 'logo.png',
      path: logoPath,
      cid: 'travel-logo',
    }],
  });
  const message = await mail.compile().build();
  const raw = message
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
  } catch (error) {
    const detail = `${error?.message || ''} ${JSON.stringify(error?.response?.data || {})}`;
    if (detail.includes('invalid_grant')) {
      sendBlocked = true;
      if (sendWarning !== 'grant') {
        sendWarning = 'grant';
        console.error('Email not sent: the saved Gmail connection needs to be refreshed.');
      }
      return { sent: false, reason: 'invalid_grant' };
    }
    throw error;
  }
  return { sent: true };
}

module.exports = { getEmails, parseBookingFromEmail, sendAppEmail };
