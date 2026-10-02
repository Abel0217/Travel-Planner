const express = require('express');
const multer = require('multer');
const path = require('path');
const verifyToken = require('../FirebaseToken');
const { parseBookingFile, ensureUploadDir } = require('../services/parseBooking');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.use(verifyToken);

router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Choose a screenshot or PDF first.' });
    }

    const result = await parseBookingFile({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      bookingType: req.body.bookingType || req.query.type || 'expense',
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to parse upload:', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not read that file.' });
  }
});

router.post('/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Please upload an image.' });
    }

    const fs = require('fs');
    const dir = ensureUploadDir('avatars');
    const ext = path.extname(req.file.originalname || '').toLowerCase() || '.jpg';
    const filename = `${req.user.uid}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(dir, filename), req.file.buffer);

    const profilePicture = `/uploads/avatars/${filename}`;
    const pool = require('../database/db');
    await pool.query(
      'UPDATE core.users SET profile_picture = $1 WHERE uid = $2',
      [profilePicture, req.user.uid]
    );

    res.json({ success: true, profile_picture: profilePicture });
  } catch (error) {
    console.error('Avatar upload failed:', error);
    res.status(500).json({ error: 'Could not save that photo.' });
  }
});

// Pictures dropped into the shared Trip Notes page.
router.post('/note-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Please choose an image.' });
    }

    const fs = require('fs');
    const dir = ensureUploadDir('notes');
    const ext = (path.extname(req.file.originalname || '').toLowerCase() || '.jpg').replace(/[^.a-z0-9]/g, '');
    const filename = `${req.user.uid}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(dir, filename), req.file.buffer);

    res.json({ success: true, url: `/uploads/notes/${filename}` });
  } catch (error) {
    console.error('Note image upload failed:', error);
    res.status(500).json({ error: 'Could not save that picture.' });
  }
});

module.exports = router;
