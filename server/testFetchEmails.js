const EmailFetcher = require('./services/gmailIMAPFetcher');

const imapConfig = {
    user: 'travelplannerbookings@gmail.com',
    password: 'mvxb bwac dflc qteg', 
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false } 
};

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
