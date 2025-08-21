const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const Request = require('../models/Request');
const User = require('../models/User');

// @route   GET /api/requests
// @desc    Get user's requests with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      type, 
      status, 
      sortBy = 'newest',
      page = 1, 
      limit = 10 
    } = req.query;

    let query = { user: req.user.userId };

    // Apply filters
    if (type) query.type = type;
    if (status) query.status = status;

    // Build sort criteria
    let sortCriteria = {};
    switch (sortBy) {
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'updated':
        sortCriteria = { updatedAt: -1 };
        break;
      default: // newest
        sortCriteria = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await Request.find(query)
      .populate('assignedVolunteer', 'name phone email')
      .populate('volunteerApplications.volunteer', 'name phone email')
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    res.json({
      message: 'Requests retrieved successfully',
      requests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: requests.length,
        totalRequests: total
      }
    });

  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      message: 'Server error retrieving requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/requests
// @desc    Create a new request
// @access  Private
router.post('/', [
  auth,
  body('type')
    .isIn(['blood', 'elder_support', 'complaint'])
    .withMessage('Invalid request type'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('location.address')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Address is required and must be at least 5 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  // Blood request validations
  body('bloodType')
    .if(body('type').equals('blood'))
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Valid blood type is required for blood requests'),
  body('urgencyLevel')
    .if(body('type').equals('blood'))
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Valid urgency level is required for blood requests'),

  // Elder support validations
  body('serviceType')
    .if(body('type').equals('elder_support'))
    .notEmpty()
    .withMessage('Service type is required for elder support requests'),
  body('dueDate')
    .if(body('type').equals('elder_support'))
    .isISO8601()
    .withMessage('Valid due date is required for elder support requests'),

  // Complaint validations
  body('title')
    .if(body('type').equals('complaint'))
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters for complaints'),
  body('description')
    .if(body('type').equals('complaint'))
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters for complaints'),
  body('category')
    .if(body('type').equals('complaint'))
    .notEmpty()
    .withMessage('Category is required for complaints')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.userId);

    // Ensure we have a phone number
    const phoneNumber = req.body.phone || user.phone;
    if (!phoneNumber) {
      return res.status(400).json({
        message: 'Phone number is required. Please update your profile with a phone number.',
        error: 'PHONE_REQUIRED'
      });
    }

    const requestData = {
      type: req.body.type,
      user: req.user.userId,
      name: req.body.name,
      phone: phoneNumber,
      location: req.body.location
    };

    // Add type-specific fields
    if (req.body.type === 'blood') {
      requestData.bloodType = req.body.bloodType;
      requestData.urgencyLevel = req.body.urgencyLevel;
      requestData.priority = req.body.urgencyLevel; // Map urgency to priority
    } else if (req.body.type === 'elder_support') {
      requestData.serviceType = req.body.serviceType;
      requestData.dueDate = new Date(req.body.dueDate);
    } else if (req.body.type === 'complaint') {
      requestData.title = req.body.title;
      requestData.description = req.body.description;
      requestData.category = req.body.category;
      requestData.images = req.body.images || [];
    }

    const request = new Request(requestData);
    await request.save();

    // Populate the response
    await request.populate('user', 'name phone email');

    res.status(201).json({
      message: `${req.body.type.replace('_', ' ')} request created successfully`,
      request
    });

  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      message: 'Server error creating request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/requests/dashboard
// @desc    Get user's dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const dashboardData = await Request.getUserDashboard(req.user.userId);

    res.json({
      message: 'Dashboard data retrieved successfully',
      ...dashboardData
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      message: 'Server error retrieving dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/requests/:id
// @desc    Get single request by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('user', 'name phone email address')
      .populate('assignedVolunteer', 'name phone email')
      .populate('volunteerApplications.volunteer', 'name phone email')
      .populate('updates.updatedBy', 'name');

    if (!request) {
      return res.status(404).json({
        message: 'Request not found'
      });
    }

    const user = await User.findById(req.user.userId);

    // Check access permissions
    if (user.role === 'citizen' && request.user._id.toString() !== req.user.userId) {
      return res.status(403).json({
        message: 'Access denied. You can only view your own requests.'
      });
    }

    res.json({
      message: 'Request retrieved successfully',
      request
    });

  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      message: 'Server error retrieving request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/requests/:id
// @desc    Update request
// @access  Private (Owner only)
router.put('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        message: 'Request not found'
      });
    }

    // Check if user owns the request
    if (request.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: 'Access denied. You can only update your own requests.'
      });
    }

    // Only allow updates if request is pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        message: 'Cannot update request that is no longer pending'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'location', 'contactInfo'];
    const typeSpecificUpdates = {
      blood: ['bloodType', 'urgencyLevel'],
      elder_support: ['serviceType', 'dueDate'],
      complaint: ['title', 'description', 'category']
    };

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (typeSpecificUpdates[request.type]) {
      typeSpecificUpdates[request.type].forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
    }

    Object.assign(request, updates);
    await request.save();

    await request.populate('user', 'name phone email');
    await request.populate('assignedVolunteer', 'name phone email');

    res.json({
      message: 'Request updated successfully',
      request
    });

  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({
      message: 'Server error updating request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/requests/:id
// @desc    Delete request
// @access  Private (Owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        message: 'Request not found'
      });
    }

    // Check if user owns the request
    if (request.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: 'Access denied. You can only delete your own requests.'
      });
    }

    await Request.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Request deleted successfully'
    });

  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({
      message: 'Server error deleting request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
