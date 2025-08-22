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
    if (status) {
      // Handle multiple status values separated by comma
      const statusArray = status.split(',').map(s => s.trim());
      query.status = { $in: statusArray };
    }

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
      .populate('accepters.user', 'name phone email')
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    // Filter requests to show contact details only to authorized users
    const filteredRequests = requests.map(request => {
      const isOwner = request.user._id.toString() === req.user.userId.toString();
      const isAccepter = request.accepters && request.accepters.some(
        accepter => accepter.user._id.toString() === req.user.userId.toString()
      );

      // If user is owner or accepter, show full details
      if (isOwner || isAccepter) {
        return request;
      }

      // For others, hide contact details
      const filteredRequest = request.toObject();
      if (filteredRequest.accepters) {
        filteredRequest.accepters = filteredRequest.accepters.map(accepter => ({
          ...accepter,
          user: {
            _id: accepter.user._id,
            name: 'Hidden', // Hide name
            email: 'Hidden', // Hide email
            phone: 'Hidden' // Hide phone
          }
        }));
      }

      // Hide requester contact details for non-owners
      if (!isOwner) {
        filteredRequest.phone = 'Hidden';
      }

      return filteredRequest;
    });

    res.json({
      message: 'Requests retrieved successfully',
      requests: filteredRequests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: filteredRequests.length,
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

// Get requests that user has accepted (volunteered for)
router.get('/accepted', auth, async (req, res) => {
  try {
    const requests = await Request.find({
      'accepters.user': req.user.userId
    })
    .populate('user', 'name email')
    .populate('accepters.user', 'name email phone')
    .sort({ 'accepters.acceptedAt': -1 });

    // Filter to only show the user's acceptance details
    const acceptedRequests = requests.map(request => {
      const userAcceptance = request.accepters.find(
        accepter => accepter.user._id.toString() === req.user.userId.toString()
      );

      return {
        _id: request._id,
        type: request.type,
        name: request.name,
        phone: request.phone,
        location: request.location,
        bloodType: request.bloodType,
        urgencyLevel: request.urgencyLevel,
        status: request.status,
        createdAt: request.createdAt,
        requester: request.user,
        acceptance: {
          acceptedAt: userAcceptance?.acceptedAt || new Date(),
          status: userAcceptance?.status || 'accepted'
        }
      };
    });

    res.json({
      success: true,
      requests: acceptedRequests
    });
  } catch (error) {
    console.error('Error fetching accepted requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accepted requests'
    });
  }
});

// Get accepted blood requests with mutual details (for both requester and donor)
router.get('/blood/accepted', auth, async (req, res) => {
  try {
    // Find requests where user is either the requester or the accepter
    const requests = await Request.find({
      type: 'blood',
      status: 'accepted',
      $or: [
        { user: req.user.userId }, // User is the requester
        { 'accepters.user': req.user.userId } // User is the accepter
      ]
    })
    .populate('user', 'name phone email')
    .populate('accepters.user', 'name phone email')
    .sort({ updatedAt: -1 });

    const acceptedRequests = requests.map(request => {
      const isRequester = request.user._id.toString() === req.user.userId.toString();
      const accepter = request.accepters[0]; // Only one accepter in our system

      return {
        _id: request._id,
        bloodType: request.bloodType,
        urgencyLevel: request.urgencyLevel,
        location: request.location,
        status: request.status,
        createdAt: request.createdAt,
        acceptedAt: accepter?.acceptedAt,
        userRole: isRequester ? 'requester' : 'donor',
        requester: {
          name: request.user.name,
          phone: request.user.phone,
          email: request.user.email
        },
        donor: accepter ? {
          name: accepter.user.name,
          phone: accepter.user.phone,
          email: accepter.user.email,
          acceptedAt: accepter.acceptedAt
        } : null
      };
    });

    res.json({
      success: true,
      requests: acceptedRequests
    });
  } catch (error) {
    console.error('Error fetching accepted blood requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accepted blood requests'
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
    if (request.user.toString() !== req.user.userId.toString()) {
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

// Get public blood requests (for donation)
router.get('/public/blood', auth, async (req, res) => {
  try {
    const requests = await Request.find({
      type: 'blood',
      status: 'pending', // Only show pending requests
      user: { $ne: req.user.userId }, // Exclude user's own requests
      $or: [
        { accepters: { $exists: false } }, // No accepters field
        { accepters: { $size: 0 } } // Empty accepters array
      ]
    })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      requests: requests.map(request => ({
        _id: request._id,
        name: request.name,
        phone: 'Hidden', // Hide phone until accepted
        location: request.location,
        bloodType: request.bloodType,
        urgencyLevel: request.urgencyLevel,
        status: request.status,
        createdAt: request.createdAt,
        user: {
          _id: request.user._id,
          name: 'Hidden' // Hide requester name until accepted
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching public blood requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blood requests'
    });
  }
});

// Get full contact details for accepted blood request (for requester and donor only)
router.get('/:id/contacts', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('user', 'name phone email')
      .populate('accepters.user', 'name phone email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.type !== 'blood') {
      return res.status(400).json({
        success: false,
        message: 'Contact details only available for blood requests'
      });
    }

    const isRequester = request.user._id.toString() === req.user.userId.toString();
    const isAccepter = request.accepters && request.accepters.some(
      accepter => accepter.user._id.toString() === req.user.userId.toString()
    );

    // Only allow requester or accepter to see contact details
    if (!isRequester && !isAccepter) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only requester and donor can view contact details.'
      });
    }

    // Only show contacts for accepted requests
    if (request.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Contact details only available for accepted requests'
      });
    }

    const accepter = request.accepters[0]; // Only one accepter in our system

    res.json({
      success: true,
      request: {
        _id: request._id,
        bloodType: request.bloodType,
        urgencyLevel: request.urgencyLevel,
        location: request.location,
        status: request.status,
        createdAt: request.createdAt,
        acceptedAt: accepter?.acceptedAt,
        userRole: isRequester ? 'requester' : 'donor',
        requester: {
          name: request.user.name,
          phone: request.user.phone,
          email: request.user.email
        },
        donor: accepter ? {
          name: accepter.user.name,
          phone: accepter.user.phone,
          email: accepter.user.email,
          acceptedAt: accepter.acceptedAt
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching contact details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact details'
    });
  }
});

// Volunteer for a blood request
router.post('/:id/volunteer', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate('user', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.type !== 'blood') {
      return res.status(400).json({
        success: false,
        message: 'Can only volunteer for blood requests'
      });
    }

    if (request.user._id.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot volunteer for your own request'
      });
    }

    // Get volunteer's information
    const volunteer = await User.findById(req.user.userId);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }

    // Check if request already has an accepter (one-to-one system)
    if (request.accepters && request.accepters.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This blood request has already been accepted by another donor'
      });
    }

    // Check if user already volunteered
    const alreadyVolunteered = request.accepters.some(
      accepter => accepter.user.toString() === req.user.userId
    );

    if (alreadyVolunteered) {
      return res.status(400).json({
        success: false,
        message: 'You have already volunteered for this request'
      });
    }

    // Add volunteer to the request (only one allowed)
    request.accepters.push({
      user: req.user.userId,
      acceptedAt: new Date(),
      status: 'accepted'
    });

    // Update request status to accepted
    request.status = 'accepted';

    await request.save();

    // Populate the request with user details for response
    await request.populate('user', 'name phone email');
    await request.populate('accepters.user', 'name phone email');

    res.json({
      success: true,
      message: 'Thank you for volunteering! You can now see the requester\'s contact details.',
      request: {
        _id: request._id,
        bloodType: request.bloodType,
        urgencyLevel: request.urgencyLevel,
        location: request.location,
        status: request.status,
        createdAt: request.createdAt,
        acceptedAt: new Date(),
        userRole: 'donor',
        requester: {
          name: request.user.name,
          phone: request.user.phone,
          email: request.user.email
        },
        donor: {
          name: volunteer.name,
          phone: volunteer.phone,
          email: volunteer.email,
          acceptedAt: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error volunteering for request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to volunteer for request'
    });
  }
});

// Get accepters for a specific request (for request owner)
router.get('/:id/accepters', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('accepters.user', 'name email phone');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Only allow request owner to see accepters
    if (request.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view accepters for this request'
      });
    }

    res.json({
      success: true,
      accepters: request.accepters.map(accepter => ({
        _id: accepter._id,
        user: accepter.user,
        acceptedAt: accepter.acceptedAt,
        status: accepter.status
      }))
    });
  } catch (error) {
    console.error('Error fetching request accepters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request accepters'
    });
  }
});

module.exports = router;
