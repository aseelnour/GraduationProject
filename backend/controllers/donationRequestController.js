const { validationResult } = require('express-validator');
const DonationRequest = require('../models/DonationRequest');
const Donation = require('../models/Donationmodel');
const { validateDocuments } = require('../utils/documentValidator');
const { decryptDonorInfo } = require('./admin.controller');

// @desc    Create a new donation request
// @route   POST /api/donation-requests
// @access  Public
exports.createDonationRequest = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      requestType,
      title,
      firstName,
      lastName,
      idNumber,
      phoneNumber,
      email,
      city,
      bankName,
      accountHolderName,
      accountNumber,
      iban,
      branchName,
      swiftCode,
      dynamicFields,
      additionalNotes,
      urgencyLevel
    } = req.body;

    // Parse dynamicFields if it's a string (from FormData)
    let parsedDynamicFields = dynamicFields;
    if (typeof dynamicFields === 'string') {
      try {
        parsedDynamicFields = JSON.parse(dynamicFields);
      } catch (e) {
        parsedDynamicFields = {};
      }
    }

    // Validate uploaded documents with OpenAI (if API key is configured)
    let validationResults = null;
    if (req.files && req.files.length > 0 && process.env.OPENAI_API_KEY) {
      console.log('Starting document validation with OpenAI...');
      try {
        validationResults = await validateDocuments(req.files);
        console.log('Validation completed:', validationResults);
      } catch (validationError) {
        console.error('Document validation error:', validationError);
        // Continue without validation if there's an error
        console.log('Continuing without validation due to error');
      }
    } else if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not configured, skipping document validation');
    }

    // Process uploaded files
    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        const docData = {
          name: file.fieldname,
          originalName: file.originalname,
          path: file.path,
          filename: file.filename,
          type: file.mimetype,
          size: file.size
        };

        // Add validation results if available
        if (validationResults && validationResults.documents[index]) {
          docData.validation = {
            isValid: validationResults.documents[index].isValid,
            confidence: validationResults.documents[index].confidence,
            analysis: validationResults.documents[index].analysis
          };
        }

        documents.push(docData);
      });
    }

    // Generate sequential case number
    const currentYear = new Date().getFullYear();
    const prefix = `${currentYear}-`;
    
    // Find the latest case number for current year
    const latestRequest = await DonationRequest.findOne({
      caseNumber: new RegExp(`^${prefix}\\d{4}$`)
    }).sort({ caseNumber: -1 });

    let nextNumber = 1;
    if (latestRequest && latestRequest.caseNumber) {
      const lastNumber = parseInt(latestRequest.caseNumber.slice(-4), 10);
      nextNumber = lastNumber + 1;
    }

    const caseNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
    console.log('Generated case number:', caseNumber);

    // Create donation request
    const donationRequest = await DonationRequest.create({
      caseNumber,
      userId: req.user ? req.user.id : null, // If user is authenticated
      requestType,
      title,
      firstName,
      lastName,
      idNumber,
      phoneNumber,
      totalAmount: parsedDynamicFields?.totalAmount ?? 0,
      totalDonations: 0,
      email,
      city,
      bankName,
      accountHolderName,
      accountNumber,
      iban,
      branchName,
      swiftCode,
      dynamicFields: parsedDynamicFields || {},
      additionalNotes,
      urgencyLevel,
      documents,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Donation request submitted successfully',
      donationRequest: {
        id: donationRequest._id,
        caseNumber: donationRequest.caseNumber,
        requestType: donationRequest.requestType,
        firstName: donationRequest.firstName,
        lastName: donationRequest.lastName,
        email: donationRequest.email,
        status: donationRequest.status,
        createdAt: donationRequest.createdAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating donation request'
    });
  }
};

// @desc    Get all donation requests
// @route   GET /api/donation-requests
// @access  Private/Admin
exports.getAllDonationRequests = async (req, res) => {
  try {
    let {
      status,
      requestType,
      urgencyLevel,
      sortBy = 'createdAt',
      order = 'desc',
      type,
      sort,
      search
    } = req.query;

    const user = req.user;

    if (user?.role !== 'admin') {
      status = 'approved';
    }

    // Build query
    const query = {};
    if (status) query.status = status;

    // Handle type filter
    if (type && type !== 'all') {
      query.requestType = type;
    } else if (requestType) {
      query.requestType = requestType;
    }

    if (urgencyLevel) query.urgencyLevel = urgencyLevel;

    // Handle search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { caseNumber: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
        { title: searchRegex }
      ];
    }

    // Build sort based on frontend requirements
    let sortOption = {};

    if (sort === 'urgent') {
      // Sort by urgency level (critical > high > medium > low) then by createdAt
      const urgencyOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const donationRequests = await DonationRequest.find(query)
        .populate('userId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName')
        .lean();

      // Sort in memory by urgency
      donationRequests.sort((a, b) => {
        const urgencyDiff = (urgencyOrder[b.urgencyLevel] || 0) - (urgencyOrder[a.urgencyLevel] || 0);
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return res.status(200).json({ success: true, data: donationRequests });

    } else if (sort === 'remaining') {
      // Sort by remaining amount (totalAmount - totalDonations), ascending
      const donationRequests = await DonationRequest.find(query)
        .populate('userId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName')
        .lean();

      donationRequests.sort((a, b) => {
        const remainingA = (a.totalAmount || 0) - (a.totalDonations || 0);
        const remainingB = (b.totalAmount || 0) - (b.totalDonations || 0);
        return remainingA - remainingB;
      });

      return res.status(200).json({ success: true, data: donationRequests });

    } else if (sort === 'default') {
      // Default: most recent first
      sortOption = { createdAt: -1 };
    } else {
      // Custom sortBy
      sortOption[sortBy] = order === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const donationRequests = await DonationRequest.find(query)
      .sort(sortOption)
      .populate('userId', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName');

    res.status(200).json({ success: true, data: donationRequests });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching donation requests'
    });
  }
};

// @desc    Get single donation request by ID
// @route   GET /api/donation-requests/:id
// @access  Private/Admin
exports.getDonationRequestById = async (req, res) => {
  try {
    const donationRequest = await DonationRequest.findById(req.params.id)
      .populate('userId', 'firstName lastName email phone')
      .populate('reviewedBy', 'firstName lastName email');

    if (!donationRequest) {
      return res.status(404).json({
        success: false,
        message: 'Donation request not found'
      });
    }

    res.status(200).json(donationRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching donation request'
    });
  }
};

// @desc    Get user's own donation requests
// @route   GET /api/donation-requests/my-requests
// @access  Private
exports.getMyDonationRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, requestType } = req.query;

    // Build query for user's email
    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (requestType) query.requestType = requestType;

    // Execute query with pagination
    const donationRequests = await DonationRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    for await (const donationRequest of donationRequests) {
      donationRequest.donations = await Donation.find({ caseId: donationRequest._id }).sort({ createdAt: -1 }).lean()
      for await(const donation of donationRequest.donations) {
        donation.donorInfo = decryptDonorInfo(donation.donorInfo)
      }
    }

    // Count total documents
    const count = await DonationRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      donationRequests,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalRequests: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your donation requests'
    });
  }
};

// @desc    Update donation request status
// @route   PUT /api/donation-requests/:id/status
// @access  Private/Admin
exports.updateDonationRequestStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const donationRequest = await DonationRequest.findById(req.params.id);

    if (!donationRequest) {
      return res.status(404).json({
        success: false,
        message: 'Donation request not found'
      });
    }

    // تحديث حالة الطلب
    donationRequest.status = status;
    if (adminNotes) donationRequest.adminNotes = adminNotes;
    donationRequest.reviewedBy = req.user.id;
    donationRequest.reviewedAt = Date.now();

    await donationRequest.save();

    // ====================================================
    // ✅ إنشاء كفالة تلقائيًا عند الموافقة على طلب كفالة
    // ====================================================
    if (
      status === 'approved' &&
      donationRequest.requestType === 'sponsoring'
    ) {
      // تحقق إن كانت الكفالة موجودة مسبقًا
      const existingSponsorship = await Sponsorship.findOne({
        donationRequestId: donationRequest._id
      });

      if (!existingSponsorship) {

        // تحديد نوع الكفالة
        const type =
          donationRequest.dynamicFields?.sponsoringType || 'living';

        const prefixMap = {
          orphans: 'ORP',
          educational: 'EDU',
          health: 'HEA',
          living: 'LIV',
          general: 'GEN'
        };

        const prefix = prefixMap[type] || 'GEN';

        // توليد caseId متسلسل
        const latest = await Sponsorship.findOne({
          caseId: new RegExp(`^${prefix}\\d{3}$`)
        }).sort({ caseId: -1 });

        const nextNum = latest
          ? parseInt(latest.caseId.slice(3), 10) + 1
          : 1;

        const caseId = `${prefix}${String(nextNum).padStart(3, '0')}`;

        // إنشاء الكفالة
        await Sponsorship.create({
          caseId,
          firstName: donationRequest.firstName,
          city: donationRequest.city,
          type,
          amountPerPeriod: donationRequest.dynamicFields?.amountPerPeriod,
          periodLabel: donationRequest.dynamicFields?.periodLabel,
          durationLabel: donationRequest.dynamicFields?.durationLabel,
          shortDescription:
            donationRequest.dynamicFields?.shortDescription ||
            'كفالة إنسانية',
          urgencyLevel: donationRequest.urgencyLevel,
          totalPeriods: donationRequest.dynamicFields?.totalPeriods || 1,
          donationRequestId: donationRequest._id,
          needyId: donationRequest.userId,
          status: 'not sponsored',
          paidPeriods: 0,
          createdBy: req.user.id
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Donation request status updated successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating donation request'
    });
  }
};


// @desc    Delete donation request
// @route   DELETE /api/donation-requests/:id
// @access  Private/Admin
exports.deleteDonationRequest = async (req, res) => {
  try {
    const donationRequest = await DonationRequest.findById(req.params.id);

    if (!donationRequest) {
      return res.status(404).json({
        success: false,
        message: 'Donation request not found'
      });
    }

    await donationRequest.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Donation request deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting donation request'
    });
  }
};

// @desc    Get donation request statistics
// @route   GET /api/donation-requests/stats
// @access  Private/Admin
exports.getDonationRequestStats = async (req, res) => {
  try {
    const totalRequests = await DonationRequest.countDocuments();
    const pendingRequests = await DonationRequest.countDocuments({ status: 'pending' });
    const approvedRequests = await DonationRequest.countDocuments({ status: 'approved' });
    const rejectedRequests = await DonationRequest.countDocuments({ status: 'rejected' });
    const completedRequests = await DonationRequest.countDocuments({ status: 'completed' });

    // Count by request type
    const requestsByType = await DonationRequest.aggregate([
      {
        $group: {
          _id: '$requestType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Count by urgency level
    const requestsByUrgency = await DonationRequest.aggregate([
      {
        $group: {
          _id: '$urgencyLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        completed: completedRequests,
        byType: requestsByType,
        byUrgency: requestsByUrgency
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};
