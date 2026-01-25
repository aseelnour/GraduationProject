// backend/api/campaignRoutes.js
const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
// جلب الحملات: للجميع (حتى الزوار — حسب ما هو مطلوب في المشروع)
router.get('/', campaignController.getAllCampaigns);
router.get('/:id', campaignController.getCampaignById);

// إنشاء/تعديل/حذف: فقط للمدراء
router.post('/', protect, authorize('admin'),upload.single('image'), campaignController.createCampaign);
router.put('/:id', protect, authorize('admin'),upload.single('image'), campaignController.updateCampaign);
router.delete('/:id', protect, authorize('admin'), campaignController.deleteCampaign);

module.exports = router;