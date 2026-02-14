import express from 'express';
const router = express.Router();

import {
  createCompanyUser,
  getCompanyUsers,
  getCompanyUserById,
  updateCompanyUser,
  deleteCompanyUser,
  getUsersByCompany,
  getCompaniesByUser,
  getCompanyUserByCompanyAndUser,
  getSupervisors 
} from './companyUserController.js';

// POST /api/company-users - Create new company user
router.post('/', createCompanyUser);

router.get('/supervisors', getSupervisors);

// GET /api/company-users - Get all company users (with optional filtering)
router.get('/', getCompanyUsers);

// GET /api/company-users/:id - Get company user by ID
router.get('/:id', getCompanyUserById);

// PUT /api/company-users/:id - Update company user
router.put('/:id', updateCompanyUser);

// DELETE /api/company-users/:id - Delete company user
router.delete('/:id', deleteCompanyUser);

// GET /api/company-users/company/:companyId/user/:userId - Get specific company user relationship
router.get('/company/:companyId/user/:userId', getCompanyUserByCompanyAndUser);

// GET /api/company-users/company/:companyId - Get all users for a company
router.get('/company/:companyId', getUsersByCompany);

// GET /api/company-users/user/:userId - Get all companies for a user
router.get('/user/:userId', getCompaniesByUser);

export default router;
