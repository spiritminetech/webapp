// backend/routes/authRoutes.js
import express from 'express';
import { login, refreshToken, logout, selectCompany, getProfile, verifyToken } from './authController.js';
import { verifyToken as authVerifyToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/select-company
router.post('/select-company', selectCompany);

// GET /api/auth/profile (protected)
// router.get('/profile', authVerifyToken, getProfile);

// GET /api/auth/verify (protected)
router.get('/verify', authVerifyToken, verifyToken);

export default router;
