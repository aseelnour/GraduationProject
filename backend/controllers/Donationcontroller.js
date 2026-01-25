const NotificationService = require("../notificationService.js");
const axios = require('axios');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const Donation = require('../models/Donationmodel.js');
const DonationRequest = require('../models/DonationRequest.js')
const crypto = require('crypto');
const { encrypt } = require('../encryption.js');
/*=================================================================================================*/

exports.generateCSRFToken = (req, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    return csrfToken;
};

// middleware للتحقق من CSRF token
exports.verifyCSRFToken = (req, res, next) => {
    const tokenFromHeader = req.headers['x-csrf-token'];
    const tokenFromCookie = req.cookies['csrf-token'];

    if (!tokenFromHeader || !tokenFromCookie || tokenFromHeader !== tokenFromCookie) {
        return res.status(403).json({ message: 'CSRF token validation failed' });
    }
    next();
};


/*=======================================================================================================*/
/*=======================================================================================================*/
const exchangeRateCache = new Map();

async function getExchangeRate(baseCurrency, targetCurrency, retries = 3) {
    const cacheKey = `${baseCurrency}-${targetCurrency}`;
    const cached = exchangeRateCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 300000) {
        console.log(`✅ استخدام الكاش لسعر الصرف ${cacheKey}: ${cached.rate}`);
        return cached.rate;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const apiUrl = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;
            const response = await fetch(apiUrl);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data.rates && data.rates[targetCurrency]) {
                const rate = data.rates[targetCurrency];
                console.log(`✅ سعر الصرف ${baseCurrency}/${targetCurrency}: ${rate} (المحاولة ${attempt})`);

                // حفظ في الكاش
                exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() });
                return rate;
            } else {
                throw new Error('Rate not found');
            }
        } catch (error) {
            console.error(`❌ فشل المحاولة ${attempt} لسعر الصرف:`, error.message);

            if (attempt === retries) {
                console.error(`❌ فشل جميع المحاولات لسعر الصرف ${baseCurrency}/${targetCurrency}`);
                return null;
            }

            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

const MIN_DONATION = 1;
const MAX_DONATION = 10000;

const SUPPORTED_CURRENCIES = ['ILS', 'JOD', 'USD', 'AED'];
const TARGET_CURRENCY = 'ILS'; // العملة التي يتم التوحيد عليها

/*=======================================================================================================*/



/*********************************************************** */
exports.createDonation = async (req, res) => {
    const { caseId, amount, currency, donorInfo, paymentMethod, transactionId, anonymous, author, authorName } = req.body;

    const originalCurrency = currency ? currency.toUpperCase() : TARGET_CURRENCY;
    const originalAmount = parseFloat(amount);
    const isAnonymous = !!anonymous;
    const user = req.user;

    // =================== التحقق الأساسي ===================
    if (!caseId || !originalAmount || !donorInfo || !paymentMethod || !transactionId || originalAmount <= 0) {
        return res.status(400).json({ message: 'بيانات التبرع غير كاملة أو المبلغ غير صالح' });
    }

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
        return res.status(400).json({ message: 'معرّف الحالة (caseId) غير صالح' });
    }

    if (!SUPPORTED_CURRENCIES.includes(originalCurrency)) {
        return res.status(400).json({ message: `العملة ${originalCurrency} غير مدعومة حاليًا` });
    }

    // =================== فحص تطابق البريد الإلكتروني ===================
    const donorEmail = donorInfo.email;
    const userEmail = user ? user.email : null;

    console.log('🔍 فحص تطابق البريد الإلكتروني:', {
        donorEmail,
        userEmail,
        userExists: !!user,
        isAnonymous,
        isLoggedIn: !!req.user
    });

    if (user && userEmail) {
        if (donorEmail !== userEmail) {
            return res.status(400).json({
                message: 'البريد الإلكتروني لا يتطابق مع حسابك',
                details: {
                    enteredEmail: donorEmail,
                    registeredEmail: userEmail
                },
                code: 'EMAIL_MISMATCH'
            });
        }
        console.log('✅ البريد الإلكتروني متطابق مع حساب المستخدم');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!donorEmail || !emailRegex.test(donorEmail)) {
        return res.status(400).json({
            message: 'البريد الإلكتروني غير صالح',
            details: 'يرجى إدخال بريد إلكتروني صحيح',
            code: 'INVALID_EMAIL'
        });
    }

    let amountInILS = originalAmount;

    if (originalCurrency !== TARGET_CURRENCY) {
        const rate = await getExchangeRate(originalCurrency, TARGET_CURRENCY);
        if (rate === null) {
            return res.status(503).json({
                message: `فشل في جلب سعر الصرف للعملة ${originalCurrency}. يرجى المحاولة لاحقًا.`,
            });
        }
        amountInILS = parseFloat((originalAmount * rate).toFixed(2));
    }

    try {
        // البحث عن الحالة
        const caseData = await DonationRequest.findById(caseId);

        if (!caseData || caseData.status !== 'approved') {
            return res.status(404).json({ message: 'الحالة غير موجودة أو غير معتمدة' });
        }

        let caseOwnerId = null;
        let caseOwnerEmail = caseData.email;

        if (caseData.userId && caseData.userId.toString() !== 'undefined') {
            caseOwnerId = caseData.userId;
            console.log('✅ استخدام author كـ caseOwnerId:', getUserIdForNotification(caseOwnerId, caseOwnerEmail));
        }
        else if (caseOwnerEmail) {
            caseOwnerId = `email_${caseOwnerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
            console.log('✅ إنشاء معرف من البريد الإلكتروني:', caseOwnerId);
        }

        console.log('🔍 معلومات صاحب الحالة المحدثة:', {
            caseOwnerId,
            caseOwnerEmail,
            authorExistsInDB: !!caseData.userId
        });

        console.log('🔍 معلومات صاحب الحالة من DB:', {
            caseId: caseData._id,
            caseTitle: caseData.title,
            caseOwnerId: caseOwnerId ? getUserIdForNotification(caseOwnerId, caseOwnerEmail) : null,
            caseOwnerEmail,
            authorName: caseData.authorName,
            isEmailValid: emailRegex.test(caseOwnerEmail)
        });

        // تحقق من صحة بريد صاحب الحالة
        if (!caseOwnerEmail || !emailRegex.test(caseOwnerEmail)) {
            console.error('❌ بريد صاحب الحالة غير صالح:', caseOwnerEmail);
        }

        // التحقق من أن transactionId غير مكرر
        const existingDonation = await Donation.findOne({ transactionId });
        if (existingDonation) {
            return res.status(400).json({
                message: 'رقم المعاملة مكرر، يرجى المحاولة مرة أخرى',
                code: 'DUPLICATE_TRANSACTION'
            });
        }

        const requiredAmount = caseData.totalAmount;
        const donatedAmount = caseData.totalDonations || 0;
        const remainingAmount = requiredAmount - donatedAmount;

        if (remainingAmount <= 0) {
            return res.status(400).json({
                message: 'عذراً، هذه الحالة اكتملت بالكامل بفضل المتبرعين.',
                status: 'completed'
            });
        }

        if (amountInILS > remainingAmount) {
            const maxAllowed = remainingAmount.toFixed(2);
            return res.status(400).json({
                message: `عذراً، المبلغ المتبرع به (${amountInILS} ${TARGET_CURRENCY}) يتجاوز المبلغ المتبقي للحالة. الحد الأقصى المسموح به هو ${maxAllowed} ${TARGET_CURRENCY}.`,
                maxAllowed,
                remainingAmount
            });
        }

        if (amountInILS < MIN_DONATION || amountInILS > MAX_DONATION) {
            return res.status(400).json({
                message: `سياسه الموقع المبلغ يجب أن يكون بين ${MIN_DONATION} و ${MAX_DONATION} ${TARGET_CURRENCY}`
            });
        }

        const donationAuthorId = (user && (user._id || user.id)) || author;
        const donationAuthorName = (user && user.name) || authorName;

        if (!donationAuthorId || !donationAuthorName) {
            return res.status(400).json({
                message: 'خطأ: معرّف الكاتب واسمه مفقودان.',
                details: 'لم يتم توفيرهما عبر التوكن أو الـ request body.'
            });
        }

        // =================== حفظ البيانات الأصلية غير المشفرة ===================
        const originalDonorData = {
            name: donorInfo.name,
            email: donorInfo.email,
            phone: donorInfo.phone,
            idcard: donorInfo.idcard
        };

        console.log('📝 البيانات الأصلية غير المشفرة:', originalDonorData);

        // =================== التشفير دائماً في قاعدة البيانات ===================
        const donorDataToSave = {
            userId: user._id,
            name: encrypt(donorInfo.name),
            email: encrypt(donorInfo.email),
            phone: encrypt(donorInfo.phone),
            idcard: encrypt(donorInfo.idcard),
            anonymous: isAnonymous
        };

        // =================== إنشاء التبرع ===================
        const newDonation = new Donation({
            caseId,
            title: caseData.title,
            amount: amountInILS,
            originalAmount,
            originalCurrency,
            currency: TARGET_CURRENCY,
            donorInfo: donorDataToSave,
            paymentMethod,
            transactionId,
            author: donationAuthorId,
            authorName: donationAuthorName
        });

        await newDonation.save();

        console.log('✅ التبرع تم حفظه بنجاح:', {
            donationId: newDonation._id,
            isAnonymous,
            donorEmail: originalDonorData.email,
            encrypted: true
        });

        // =================== إشعار للمتبرع (باستخدام البيانات الأصلية) ===================
        const notificationUserId = getUserIdForNotification(
            (user && (user._id || user.id)) || donationAuthorId,
            originalDonorData.email
        );

        // إشعار للمتبرع (باستخدام البيانات الأصلية غير المشفرة)
        await NotificationService.createNotification({
            user: notificationUserId,
            title: '🎉 تم التبرع بنجاح! شكراً لك.',
            message: `شكرا لدعمك حالة "${caseData.title || (caseData.firstName + " " + caseData.lastName)}" بمبلغ ${amountInILS} شيكل. سيصلك إيصال عبر البريد.`,
            type: 'donation_thanks',
            channels: ['dashboard', 'email'],
            referenceId: caseData._id,
            metadata: {
                donationId: newDonation._id,
                caseId: caseId,
                amount: amountInILS,
                originalAmount: originalAmount,
                originalCurrency: originalCurrency,
                currency: TARGET_CURRENCY,
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                createdAt: new Date(),

                // ⭐️ البيانات الأصلية غير المشفرة للمتبرع
                donorInfo: originalDonorData,

                // ⭐️ بيانات الحالة
                caseData: {
                    _id: caseData._id,
                    title: caseData.title,
                    status: caseData.status,
                    email: caseData.email
                },

                // ⭐️ بيانات إضافية
                userEmail: originalDonorData.email,
                caseOwnerEmail: caseOwnerEmail,
                caseItemTitle: caseData.title,
                isAnonymous: isAnonymous,
                donatedAmount: amountInILS,
                category: caseData.category
            }
        });

        console.log('📧 إشعار الشكر تم إرساله إلى المتبرع:', originalDonorData.email);

        // =================== إشعار لصاحب الحالة ===================
        if (caseOwnerEmail) {
            const safeUserId = getUserIdForNotification(caseOwnerId, caseOwnerEmail);

            if (caseOwnerEmail !== originalDonorData.email) {
                await NotificationService.createNotification({
                    user: safeUserId,
                    title: '📬 وصلك تبرع جديد لحالتك!',
                    message: `قام شخص ${isAnonymous ? 'مجهول' : ''} بالتبرع لحالتك "${caseData.title || (caseData.firstName + " " + caseData.lastName)}" بمبلغ ${amountInILS} شيكل.`,
                    type: 'new_donation',
                    channels: ['dashboard', 'push', 'email'],
                    referenceId: caseData._id,
                    link: `/casedetails/${caseId}`,
                    metadata: {
                        // ⭐️ بريد صاحب الحالة
                        caseOwnerEmail: caseOwnerEmail,

                        // ⭐️ بيانات المتبرع حسب المجهولية
                        donorInfo: isAnonymous ? {
                            name: 'مجهول',
                            email: 'مجهول'
                        } : originalDonorData,

                        // ⭐️ بيانات الحالة
                        caseData: {
                            _id: caseData._id,
                            title: caseData.title,
                            email: caseData.email
                        },

                        // ⭐️ معلومات التبرع
                        donation: {
                            _id: newDonation._id,
                            amount: amountInILS,
                            currency: TARGET_CURRENCY
                        },

                        // ⭐️ بيانات إضافية
                        caseItemTitle: caseData.title,
                        isAnonymous: isAnonymous,
                        category: caseData.category,
                        donatedAmount: amountInILS,
                        userEmail: caseOwnerEmail
                    }
                });

                console.log(`📧 إشعار جديد للتبرع أرسل لصاحب الحالة: ${caseOwnerEmail}`);
            } else {
                console.log('ℹ️ صاحب الحالة هو نفس المتبرع، لا حاجة لإرسال إشعار منفصل');
            }
        } else {
            console.warn('⚠️ لا يمكن إرسال إشعار لصاحب الحالة: caseOwnerEmail غير موجود');
        }

        // =================== تحديث الحالة ===================
        await DonationRequest.findByIdAndUpdate(
            caseId,
            { $inc: { totalDonations: amountInILS, donationsCount: 1 } }
        );

        // التحقق إذا اكتملت الحالة
        const updatedCase = await DonationRequest.findById(caseId);
        if (updatedCase.totalDonations >= updatedCase.totalAmount && updatedCase.status !== 'funded') {
            await DonationRequest.findByIdAndUpdate(caseId, {
                status: 'funded',
                completedAt: new Date()
            });

            // إشعار لصاحب الحالة بإكمال التمويل
            if (caseOwnerEmail) {
                const safeUserId = getUserIdForNotification(caseOwnerId, caseOwnerEmail);
                await NotificationService.createNotification({
                    user: safeUserId,
                    title: '🎉 اكتمل تمويل حالتك!',
                    message: `مبروك! اكتمل تمويل حالتك "${caseData.title || (caseData.firstName + " " + caseData.lastName)}" بالكامل.`,
                    type: 'case_completed',
                    channels: ['dashboard', 'push', 'email'],
                    referenceId: caseData._id,
                    link: `/casedetails/${caseId}`,
                    metadata: {
                        caseOwnerEmail: caseOwnerEmail,
                        caseData: {
                            _id: caseData._id,
                            title: caseData.title
                        },
                        donation: {
                            _id: newDonation._id,
                            amount: amountInILS
                        },
                        caseItemTitle: caseData.title,
                        donatedAmount: amountInILS,
                        userEmail: caseOwnerEmail
                    }
                });

                console.log(`🎉 إشعار اكتمال التمويل أرسل لصاحب الحالة: ${caseOwnerEmail}`);
            }
        }

        res.status(201).json({
            message: 'تم التبرع بنجاح',
            donation: {
                _id: newDonation._id,
                caseId: newDonation.caseId,
                amount: newDonation.amount,
                anonymous: isAnonymous,
                createdAt: newDonation.createdAt
            },
            convertedAmount: amountInILS,
            receiptEmail: originalDonorData.email,
            caseOwnerNotified: caseOwnerEmail && caseOwnerEmail !== originalDonorData.email
        });

    } catch (error) {
        console.error('Donation creation error:', error);
        if (error.message.includes('toString')) {
            console.error('❌ الخطأ في toString() - تحقق من:', {
                caseOwnerId: caseOwnerId,
                caseData: caseData ? {
                    _id: caseData._id,
                    author: caseData.author,
                    email: caseData.email
                } : 'caseData is null'
            });
        }
        res.status(500).json({ message: 'خطأ في إنشاء التبرع', error: error.message });
    }
};



const getUserIdForNotification = (userId, userEmail) => {
    // إذا كان userId موجوداً وصالحاً
    if (userId && userId !== 'undefined') {
        // إذا كان userId سلسلة نصية (string)، ارجعها كما هي
        if (typeof userId === 'string' && userId.trim() !== '') {
            return userId;
        }
        // إذا كان userId ObjectId، حوله إلى سلسلة
        else if (mongoose.Types.ObjectId.isValid(userId)) {
            return userId.toString();
        }
        // إذا كان userId كائناً يحتوي على toString
        else if (userId && typeof userId.toString === 'function') {
            return userId.toString();
        }
    }

    // إذا لم يكن userId صالحاً، استخدم البريد الإلكتروني مع بادئة
    if (userEmail) {
        return `email_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    // إذا لم يكن هناك أي معرف، استخدم معرف مؤقت
    return `temp_${Date.now()}`;
};


/*=======================================================================================================*/
exports.getAllDonations = async (req, res) => {
    try {
        const donations = await Donation.find().populate('caseId').sort({ createdAt: -1 });
        res.json(donations);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في جلب التبرعات', error });
    }
};

/*=======================================================================================================*/

exports.getDonationsByCase = async (req, res) => {
    try {
        const caseId = req.params.caseId;

        const caseData = await Case.findById(caseId);
        if (!caseData) {
            return res.status(404).json({ message: 'الحالة غير موجودة' });
        }

        if (req.user.role === 'needy') {
            if (caseData.author.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'ليس لديك صلاحية لمشاهدة تبرعات هذه الحالة' });
            }
        }

        const donations = await Donation.find({ caseId })
            .populate('caseId', 'title type currency')
            .sort({ createdAt: -1 });

        res.json(donations);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في جلب تبرعات الحالة', error });
    }
};

/*=======================================================================================================*/

exports.getDonationsByUser = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'معرّف المستخدم غير صالح' });
    }
    if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
        return res.status(403).json({ message: 'غير مصرح لك بعرض هذه التبرعات' });
    }
    try {
        const donations = await Donation.find({ 'donorInfo.userId': userId })
            .populate('caseId', 'title category')
            .sort({ createdAt: -1 });

        if (donations.length === 0) {
            return res.status(404).json({ message: 'لا توجد تبرعات لهذا المستخدم' });
        }

        const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
        const donationsCount = donations.length;

        res.status(200).json({
            userId,
            donationsCount,
            totalAmount,
            donations
        });

    } catch (error) {
        console.error('Error fetching donations by user:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء جلب التبرعات', error: error.message });
    }
};


