// backend/controllers/companyUserController.js
import CompanyUser from './CompanyUser.js';

// Create new company user
export const createCompanyUser = async (req, res) => {
  try {
    const { companyId, userId, role, isPrimary } = req.body;

    if (!companyId || !userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields (companyId, userId, role) are required'
      });
    }

    const existing = await CompanyUser.findOne({ companyId, userId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User already exists in this company'
      });
    }

    const companyUser = new CompanyUser({
      companyId,
      userId,
      role,
      isPrimary: isPrimary || false
    });

    await companyUser.save();

    res.status(201).json({
      success: true,
      data: companyUser
    });
  } catch (error) {
    console.error("createCompanyUser error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all company users with optional filters
export const getCompanyUsers = async (req, res) => {
  try {
    const { companyId, userId, role, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (companyId) filter.companyId = companyId;
    if (userId) filter.userId = userId;
    if (role) filter.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const companyUsers = await CompanyUser.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CompanyUser.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: companyUsers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: companyUsers
    });
  } catch (error) {
    console.error("getCompanyUsers error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get company user by ID
export const getCompanyUserById = async (req, res) => {
  try {
    const companyUser = await CompanyUser.findById(req.params.id);

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'Company user not found'
      });
    }

    res.status(200).json({
      success: true,
      data: companyUser
    });
  } catch (error) {
    console.error("getCompanyUserById error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update company user
export const updateCompanyUser = async (req, res) => {
  try {
    const { role, isPrimary } = req.body;

    if (req.body.companyId || req.body.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update companyId or userId. Delete and create new record instead.'
      });
    }

    const companyUser = await CompanyUser.findByIdAndUpdate(
      req.params.id,
      { role, isPrimary },
      { new: true, runValidators: true }
    );

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'Company user not found'
      });
    }

    res.status(200).json({
      success: true,
      data: companyUser
    });
  } catch (error) {
    console.error("updateCompanyUser error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete company user
export const deleteCompanyUser = async (req, res) => {
  try {
    const companyUser = await CompanyUser.findByIdAndDelete(req.params.id);

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'Company user not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Company user deleted successfully',
      data: companyUser
    });
  } catch (error) {
    console.error("deleteCompanyUser error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get users by company
export const getUsersByCompany = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const companyUsers = await CompanyUser.find({ companyId: req.params.companyId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CompanyUser.countDocuments({ companyId: req.params.companyId });

    res.status(200).json({
      success: true,
      count: companyUsers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: companyUsers
    });
  } catch (error) {
    console.error("getUsersByCompany error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get companies by user
export const getCompaniesByUser = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const companyUsers = await CompanyUser.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CompanyUser.countDocuments({ userId: req.params.userId });

    res.status(200).json({
      success: true,
      count: companyUsers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: companyUsers
    });
  } catch (error) {
    console.error("getCompaniesByUser error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get company user by company and user
export const getCompanyUserByCompanyAndUser = async (req, res) => {
  try {
    const { companyId, userId } = req.params;

    const companyUser = await CompanyUser.findOne({ companyId, userId });

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'Company user not found'
      });
    }

    res.status(200).json({
      success: true,
      data: companyUser
    });
  } catch (error) {
    console.error("getCompanyUserByCompanyAndUser error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ NEW: Get all supervisors (for deployment dropdown)
export const getSupervisors = async (req, res) => {
  try {
    const { role = 'supervisor' } = req.query;

    // Find company users with supervisor role
    const companyUsers = await CompanyUser.find({ 
      role: { $regex: new RegExp(role, 'i') }
    })
    .populate('userId', 'fullName email phone')
    .sort({ createdAt: -1 });

    // Format response
    const supervisors = companyUsers.map(cu => ({
      id: cu.userId?._id || cu.userId,
      fullName: cu.userId?.fullName || 'Unknown',
      email: cu.userId?.email,
      phone: cu.userId?.phone,
      role: cu.role,
      companyId: cu.companyId
    }));

    res.status(200).json({
      success: true,
      data: supervisors,
      count: supervisors.length,
      message: 'Supervisors fetched successfully'
    });
  } catch (error) {
    console.error("getSupervisors error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};