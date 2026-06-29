import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Invitation } from '../models/Invitation';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_key_123';

// 1. Citizen Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: 'Citizen',
      status: 'active',
      department: null,
    });

    return res.status(201).json({
      message: 'Citizen registered successfully.',
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'User account is not active.' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      department_id: user.department ? user.department.toString() : null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Send Invitation (Admin / Nodal Officer only)
router.post('/invite', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sender = req.user;
    if (!sender || (sender.role !== 'Super Admin' && sender.role !== 'Nodal Officer')) {
      return res.status(403).json({ error: 'Only Super Admin or Nodal Officers can invite department members.' });
    }

    const { email, departmentId, role } = req.body;
    if (!email || !departmentId || !role) {
      return res.status(400).json({ error: 'Email, departmentId, and role are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Create unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newInvitation = await Invitation.create({
      email: email.toLowerCase(),
      department: departmentId,
      role,
      token,
      expiresAt,
    });

    return res.status(201).json({
      message: 'Invitation created successfully.',
      invitation: newInvitation,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Accept Invitation
router.post('/accept-invite', async (req: Request, res: Response) => {
  try {
    const { token, password, firstName, lastName } = req.body;
    if (!token || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const invite = await Invitation.findOne({ token });
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invitation token.' });
    }

    if (new Date() > invite.expiresAt) {
      await Invitation.deleteOne({ _id: invite._id });
      return res.status(400).json({ error: 'Invitation has expired.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = await User.create({
      email: invite.email,
      passwordHash,
      firstName,
      lastName,
      role: invite.role,
      status: 'active',
      department: invite.department as any,
    });

    // Delete the invitation
    await Invitation.deleteOne({ _id: invite._id });

    return res.status(201).json({
      message: 'Invitation accepted and account registered successfully.',
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        department: newUser.department,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
