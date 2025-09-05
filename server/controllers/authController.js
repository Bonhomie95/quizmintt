const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.registerNewUser = async (req, res) => {
  try {
    const uuid = uuidv4();
    const { ref } = req.query;

    const user = await User.create({
      uuid,
      referredBy: ref || null,
    });

    // 🎁 Apply referral logic
    if (ref && ref !== uuid) {
      const referrer = await User.findOne({ uuid: ref });
      if (referrer) {
        referrer.coins += 200;
        await referrer.save();
      }
      user.coins += 100;
      user.hasClaimedReferral = true;
      await user.save();
    }

    // 🔐 Issue JWT (encode UUID)
    const token = jwt.sign({ uuid: user.uuid }, process.env.JWT_SECRET, {
      expiresIn: '30d', // Optional: adjust token lifespan
    });

    return res.json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

// 🔒 Set or update PIN securely
exports.setPin = async (req, res) => {
  try {
    const { pin, oldPin } = req.body;
    const user = await User.findById(req.user.id);

    if (user.pinHash && !oldPin)
      return res.status(400).json({ message: 'Old PIN required' });

    if (user.pinLockedUntil && user.pinLockedUntil > Date.now()) {
      return res.status(403).json({
        message: `Too many failed attempts. Try again after ${user.pinLockedUntil.toLocaleTimeString()}`,
      });
    }
    if (!pin || pin.length !== 6 || isNaN(pin)) {
      return res.status(400).json({ message: 'PIN must be a 6-digit number' });
    }
    if (user.hasPin && !(await bcrypt.compare(oldPin, user.pinHash))) {
      user.failedPinAttempts += 1;
      user.lastPinAttemptAt = new Date();

      if (user.failedPinAttempts >= 7) {
        user.pinLockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour lock
      }

      await user.save();
      return res.status(400).json({
        message: `Incorrect PIN. ${
          7 - user.failedPinAttempts
        } attempts remaining.`,
      });
    }

    // On success:
    user.failedPinAttempts = 0;
    user.pinLockedUntil = null;

    const hashed = await bcrypt.hash(pin, 10);
    user.pinHash = hashed;
    await user.save();

    res.json({ message: 'PIN updated' });
  } catch (err) {
    console.error('Set PIN Error:', err);
    res.status(500).json({ message: 'Failed to update PIN' });
  }
};

exports.hasPin = async (req, res) => {
  const user = await User.findById(req.user.id).select('pinHash');
  res.json({ hasPin: !!user?.pinHash });
};

exports.forgotPin = async (req, res) => {
  const { backup, newPin } = req.body;

  if (!backup || !newPin) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const user = await User.findById(req.user.id);

  if (!user.backupCode || user.backupCode !== backup) {
    return res.status(400).json({ message: 'Invalid backup code' });
  }

  const hashed = await bcrypt.hash(newPin, 10);
  user.pinHash = hashed;
  user.failedPinAttempts = 0;
  user.pinLockedUntil = null;
  await user.save();

  res.json({ message: '✅ PIN reset successfully' });
};

exports.updateWallet = async (req, res) => {
  try {
    const { pin, wallet, usdtType } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.pinHash)
      return res.status(400).json({ message: 'Set your PIN first' });

    const isMatch = await bcrypt.compare(pin, user.pinHash);
    if (!isMatch)
      return res.status(403).json({ message: 'Invalid PIN provided' });

    // Validate wallet address format
    const isValidWallet = (type, address) => {
      if (type === 'TRC20') return /^T[a-zA-Z0-9]{33}$/.test(address);
      if (type === 'ERC20' || type === 'BEP20')
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      return false;
    };

    if (!usdtType || !wallet)
      return res.status(400).json({ message: 'Missing wallet or USDT type' });

    if (!isValidWallet(usdtType, wallet))
      return res
        .status(400)
        .json({ message: `Invalid ${usdtType} wallet address` });

    user.wallet = wallet;
    user.usdtType = usdtType;
    await user.save();

    res.json({ wallet: user.wallet, usdtType: user.usdtType });
  } catch (err) {
    console.error('Update Wallet Error:', err);
    res.status(500).json({ message: 'Failed to update wallet' });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    '-pinHash -mnemonicHash'
  );
  res.json(user);
};
