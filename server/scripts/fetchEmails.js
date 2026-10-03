const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const EmailFetcher = require('../services/gmailIMAPFetcher');

const imapConfig = {
    user: process.env.GMAIL_IMAP_USER || '',
    password: process.env.GMAIL_IMAP_PASSWORD || '',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
};

if (!imapConfig.user || !imapConfig.password) {
    console.error('Set GMAIL_IMAP_USER and GMAIL_IMAP_PASSWORD in .env before running this script.');
    process.exit(1);
}

const emailFetcher = new EmailFetcher(imapConfig);

emailFetcher.on('done', () => {
    console.log('Connection to IMAP server ended.');
    process.exit(0);
});

emailFetcher.on('error', (err) => {
    console.error('IMAP Error:', err);
    process.exit(1);
});

emailFetcher.fetchEmails();
