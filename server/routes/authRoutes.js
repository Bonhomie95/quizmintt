const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  setPin,
  updateWallet,
  registerNewUser,
  getMe,
  hasPin,
  forgotPin,
} = require('../controllers/authController');
const {
  backupMnemonic,
  restoreFromMnemonic,
  generateBackup,
} = require('../controllers/backupController');
const router = express.Router();

router.post('/set-pin', authMiddleware, setPin);
router.get('/has-pin', authMiddleware, hasPin);
router.post('/forgot-pin', authMiddleware, forgotPin);
router.post('/update-wallet', authMiddleware, updateWallet);
router.post('/register', registerNewUser);
router.post('/generate-backup', authMiddleware, generateBackup);
router.post('/backup', authMiddleware, backupMnemonic);
router.post('/restore', restoreFromMnemonic);
router.get('/me', authMiddleware, getMe);


module.exports = router;
