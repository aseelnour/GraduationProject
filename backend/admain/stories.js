// دوال تحميل HTML وتهيئة شريط التنقل
async function loadHTML(file, elementId) {
    try {
        const response = await fetch(file);
        const data = await response.text();
        const container = document.getElementById(elementId);
        container.innerHTML = data;
        
        if (file === 'navbar.html') {
            initNavbar();
        }
        
        return true;
    } catch (error) {
        console.error('Error loading HTML:', error);
        return false;
    }
}

function initNavbar() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (!menuToggle || !navLinks) return;
    
    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        navLinks.classList.toggle('active');
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.navbar')) {
            navLinks.classList.remove('active');
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
    
    if (navLinks) {
        navLinks.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    document.querySelectorAll('.dropdownToggle').forEach(item => {
        item.addEventListener('click', function(e) {
            if (window.innerWidth <= 992) {
                e.preventDefault();
                const dropdown = this.parentNode;
                dropdown.classList.toggle('active');
                
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('active');
                    }
                });
            }
        });
    });
    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 992) {
            if (navLinks) navLinks.classList.remove('active');
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            }); 
        }
    });
}

window.addEventListener('DOMContentLoaded', function() {
    loadHTML('navbar.html', 'navbar-placeholder');
    loadHTML('footer.html', 'footer-placeholder');
});

//*********************************************************************************************************/
// دوال مساعدة
//*********************************************************************************************************/
function getExcerpt(content, maxLength = 150) {
    try {
        if (!content) return "اقرأ القصة كاملة...";
        
        // استخراج النص الخام من HTML
        const textOnly = content
            .replace(/<[^>]*>/g, ' ') // إزالة HTML tags
            .replace(/\s+/g, ' ')     // تحويل المسافات المتعددة إلى واحدة
            .replace(/&nbsp;/g, ' ')  // إزالة المسافات غير المنقسمة
            .trim();
        
        if (textOnly.length <= maxLength) {
            return textOnly;
        }
        
        // قص النص مع الحفاظ على آخر كلمة كاملة
        const truncated = textOnly.substr(0, maxLength);
        return truncated.substr(0, truncated.lastIndexOf(' ')) + '...';
        
    } catch (error) {
        console.error('خطأ في استخلاص المقتطف:', error);
        return "اقرأ القصة كاملة...";
    }
}

function calculateReadingTime(content) {
    try {
        // استخراج النص من HTML إذا كان موجوداً
        let textContent = content;
        if (content.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            textContent = tempDiv.textContent || tempDiv.innerText || '';
        }
        
        // حساب الكلمات
        const words = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
        const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
        
        return `${readingTimeMinutes} دقائق قراءة`;
    } catch (error) {
        console.error('خطأ في حساب وقت القراءة:', error);
        return '1 دقائق قراءة';
    }
}

function autoDirection(inputElement) {
    if (!inputElement) return;
    inputElement.addEventListener("input", function() {
        const value = this.value.trim();
        if (/^[\u0600-\u06FF]/.test(value)) {
            this.style.direction = "rtl";
            this.style.textAlign = "right";
        } else if (/^[A-Za-z0-9]/.test(value)) {
            this.style.direction = "ltr";
            this.style.textAlign = "left";
        } else if (value === "") {
            this.style.direction = "rtl";
            this.style.textAlign = "right";
        }
    });
}

//*********************************************************************************************************/
// دالة جديدة: تحديد الصورة تلقائياً حسب الحالة (الفئة)
//*********************************************************************************************************/

function getCategoryImage(category) {
    const categoryImages = {
        'صحية': 'images/dr.jpg',
        'تعليمية': 'images/university.jpg',
        'معيشية': 'images/live.PNG',
        'رعاية أيتام': 'images/ايتام.jpg',
        'طوارئ': 'images/student.jpg',
        'مشاريع': 'images/d2b45620-ede8-46e7-8fb0-6220891f8828.jpg',
        'كفالات': 'images/guara.jpg',
        'حملات': 'images/iStock-2209016591-scaled.jpg'
    };
    
         return categoryImages[category] || 'images/default-story.jpg';}


//*********************************************************************************************************/

   const exchangeRates = {
  ILS: 1,     
  USD: 3.75,   
  JOD: 5.3,    
  AED: 1.02,   
};

// دالة لتحويل أي عملة إلى شيكل
function convertToILS(amount, currency) {
  const rate = exchangeRates[currency];
  if (!rate) return null; 
  return amount * rate;  
}
//*********************************************************************************************************/
// منطق جلب القصص وعرضها
//*********************************************************************************************************/
async function loadStories() {
    try {
        const response = await fetch('http://localhost:5000/api/stories');
        
        if (!response.ok) {
            // إذا كان الخطأ 404 أو لا توجد قصص
            if (response.status === 404) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'لا توجد قصص حالياً.');
            }
            throw new Error('فشل في جلب القصص');
        }
        
        const stories = await response.json();

        const container = document.getElementById('stories-container');
        container.innerHTML = '';

        // إذا كانت القصص فارغة
        if (stories.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 1.2rem; padding: 2rem;">لا توجد قصص حالياً.</p>';
            return;
        }

        stories.forEach(story => {
            const storyImage = story.image || getCategoryImage(story.category);
            
            const cardHTML = `
                <div class="story-card">
                    <div class="story-image">
                        <img src="${storyImage}" alt="قصة نجاح">
                        <div class="story-category">${story.category}</div>
                    </div>
                    <div class="story-content">
                        <h3>${story.title}</h3>
                        <div class="story-meta">
                            <span class="story-type">
                                <i class="${story.type === 'متبرع' ? 'fas fa-hand-holding-heart' : 'fas fa-user-check'}"></i> 
                                <span class="type-text">${story.type}</span>
                            </span>
                            <span class="story-time">
                                <i class="far fa-clock"></i> ${story.time || calculateReadingTime(story.content)}
                            </span>
                        </div>
                        <p class="story-excerpt">${getExcerpt(story.content)}</p>
                        <button class="read-more" data-story="${story._id}">اقرأ القصة كاملة</button>
                    </div>
                    
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        });

        document.querySelectorAll('.read-more').forEach(button => {
            button.addEventListener('click', function() {
                const storyId = this.getAttribute('data-story');
                openStoryModal(storyId);
            });
        });

    } catch (error) {
        console.error('خطأ في جلب القصص:', error);
        const container = document.getElementById('stories-container');
        
        // عرض الرسالة المحددة من الخادم
        if (error.message.includes('لا توجد قصص حالياً')) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 1.2rem; padding: 2rem;">لا توجد قصص حالياً.</p>';
        } else {
            container.innerHTML = '<p style="text-align: center; color: var(--danger-color); font-size: 1.2rem;">حدث خطأ في تحميل القصص. يرجى المحاولة مرة أخرى.</p>';
        }
    }
}

//*********************************************************************************************************/
// منطق جلب الإحصائيات
//*********************************************************************************************************/

async function loadStats() {
    try {
        const response = await fetch('http://localhost:5000/api/stories/stats');
        if (!response.ok) throw new Error('فشل في جلب الإحصائيات');
        const stats = await response.json();
        
        document.getElementById('totalStories').textContent = stats.totalStories;
        document.getElementById('totalViews').textContent = stats.totalViews;

        // جلب القصص لحساب إجمالي التبرعات بالشيكل
        const storiesResponse = await fetch('http://localhost:5000/api/stories');
        if (!storiesResponse.ok) throw new Error('فشل في جلب القصص');
        const stories = await storiesResponse.json();

        // حساب إجمالي التبرعات بالشيكل
        let totalDonationsILS = 0;
        
        stories.forEach(story => {
            if (story.donations && story.currency) {
                const amountInILS = convertToILS(story.donations, story.currency);
                if (amountInILS !== null) {
                    totalDonationsILS += amountInILS;
                }
            }
        });

        // عرض إجمالي التبرعات بالشيكل
        const totalDonationsElement = document.getElementById('totaldonations');
        
        if (totalDonationsILS > 0) {
            totalDonationsElement.textContent = `${Math.round(totalDonationsILS).toLocaleString()} ₪`;
        } else {
            totalDonationsElement.textContent = '0 ₪';
        }
        
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        document.getElementById('totalStories').textContent = '0';
        document.getElementById('totalViews').textContent = '0';
        document.getElementById('totaldonations').textContent = '0 ₪';
    }
}

//*********************************************************************************************************/
// منطق نافذة القصة الكاملة
//*********************************************************************************************************/

async function openStoryModal(storyId) {
    try {
        const response = await fetch(`http://localhost:5000/api/stories/${storyId}`);
        if (!response.ok) throw new Error('فشل في جلب القصة');
        const story = await response.json();

        const modal = document.getElementById('story-modal');
        const modalContent = modal.querySelector('.modal-content');

        const storyImage = story.image || getCategoryImage(story.category);

        modalContent.innerHTML = `
            <div class="modal-header">
                <img src="${storyImage}" alt="${story.title}">
                <div class="modal-category">${story.category}</div>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <h2>${story.title}</h2>
                <div class="modal-meta">
                    <span class="modal-type">
                        <i class="${story.type === 'متبرع' ? 'fas fa-hand-holding-heart' : 'fas fa-user-check'}"></i> 
                        ${story.type}
                    </span>
                    <span><i class="far fa-clock"></i> ${story.time || calculateReadingTime(story.content)}</span>
                </div>
                <div class="story-full-content">
                    ${story.content}
                </div>
            </div>
        `;

        const closeBtn = modalContent.querySelector('.close-modal');
        closeBtn.addEventListener('click', closeStoryModal);
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        modal.addEventListener('click', function(event) {
            if (event.target === modal) closeStoryModal();
        });
    } catch (error) {
        console.error('خطأ في فتح القصة:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'حدث خطأ أثناء تحميل القصة. حاول مرة أخرى.',
            confirmButtonText: 'حسنا'
        });
    }
}

function closeStoryModal() {
    const modal = document.getElementById('story-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

//*********************************************************************************************************/
// منطق نافذة مشاركة القصة - الإصدار المعدل لفحص التوكن عند النقر
//*********************************************************************************************************/

document.addEventListener("DOMContentLoaded", function() {
    loadStories();
    loadStats();

    const formModal = document.getElementById('storyModal');
    const shareBtn = document.querySelector('.share-btn');
    const closeBtnShare = formModal.querySelector('.close-btn');
    const cancelBtn = formModal.querySelector('#cancelStory');
    const storyForm = document.getElementById('storyForm');

    // 🔑 وظيفة التحقق من التوكن وعرض التنبيه (New Function)
    function checkLoginAndOpenModal() {
        const token = localStorage.getItem('token')||sessionStorage.getItem('token');
        
        // 🔐 التحقق من وجود التوكن
        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'يجب تسجيل الدخول',
                text: 'يرجى تسجيل الدخول أولاً لمشاركة قصة',
                confirmButtonText: 'تسجيل الدخول'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = 'login.html';
                }
            });
            return false; // يمنع فتح النافذة
        } else {
            // فتح النافذة
            formModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            return true; // يسمح بفتح النافذة
        }
    }

    // فتح النافذة - تم استبدال الفتح المباشر بوظيفة checkLoginAndOpenModal
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            checkLoginAndOpenModal(); // يتم الفحص عند الضغط على زر المشاركة
        });
    }

    // إغلاق النافذة
    function closeFormModal() {
        formModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    if (closeBtnShare) closeBtnShare.addEventListener('click', closeFormModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeFormModal);

    // إغلاق بالنقر خارج النافذة
    window.addEventListener('click', e => {
        if (e.target === formModal) closeFormModal();
    });

    // إغلاق بالزر ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && formModal.style.display === 'flex') {
            closeFormModal();
        }
    });

    // إرسال النموذج (تم حذف فحص التوكن من هنا)
   if (storyForm) {
    storyForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 🔐 فحص التوكن
        const token = localStorage.getItem('token')|| sessionStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'انتهت الجلسة',
                text: 'انتهت مدة صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.',
                confirmButtonText: 'تسجيل الدخول'
            }).then(() => {
                window.location.href = 'login.html';
            });
            return;
        }

        // 🔍 جمع البيانات من النموذج
        const storyTitleInput = document.getElementById('storyTitle');
        const storyCategoryInput = document.getElementById('storyCategory');
        const typeElement = document.querySelector('input[name="storyType"]:checked');
        const storyContentInput = document.getElementById('storyContent');
        const donationAmountInput = document.getElementById('donationAmount'); 
        const donationCurrencyInput = document.getElementById('donationCurrency'); 

        const title = storyTitleInput.value.trim();
        const category = storyCategoryInput.value;
        const type = typeElement ? typeElement.value : null;
        const contentText = storyContentInput.value.trim();
        
        // معالجة قيمة التبرع
        let donationAmount = 0;
        if (donationAmountInput.value && donationAmountInput.value.trim() !== '') {
            donationAmount = parseFloat(donationAmountInput.value);
            if (isNaN(donationAmount) || donationAmount < 0) {
                donationAmount = 0;
            }
        }
        
        const donationCurrency = donationCurrencyInput.value || 'ILS';

        // 🔍 تحقق من البيانات
        const errors = [];
        
        if (!title || title.length < 3) {
            errors.push('العنوان يجب أن يكون 3 أحرف على الأقل');
        }
        
        if (!category) {
            errors.push('يرجى اختيار تصنيف للقصة');
        }
        
        if (!type) {
            errors.push('يرجى اختيار نوع القصة (متبرع/محتاج)');
        }
        
        if (!contentText || contentText.length < 10) {
            errors.push('المحتوى يجب أن يكون 10 أحرف على الأقل');
        }
        
        if (errors.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'بيانات ناقصة',
                html: `<div style="text-align: right; direction: rtl;">
                    <p>${errors.join('<br>')}</p>
                </div>`,
                confirmButtonText: 'حسنا'
            });
            return;
        }

        // 🔍 تحويل المحتوى إلى HTML
        const contentHTML = `<p>${contentText.split('\n').join('</p><p>')}</p>`;
        
        // 🔍 الحصول على بيانات المستخدم
        const user = JSON.parse(localStorage.getItem('user')|| sessionStorage.getItem('user'));
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'خطأ في بيانات المستخدم',
                text: 'لم يتم العثور على بيانات المستخدم، يرجى تسجيل الدخول مرة أخرى',
                confirmButtonText: 'تسجيل الدخول'
            }).then(() => {
                window.location.href = 'login.html';
            });
            return;
        }
let authorName = '';
if (user) {
    authorName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (!authorName || authorName.trim() === '') {
        authorName = user.email || 'مجهول';
    }
}
        // 🔍 إعداد البيانات للإرسال
        const storyData = {
            title: title,
            category: category,
            type: type,
            content: contentHTML,
            donations: donationAmount,
            currency: donationCurrency,
            authorName: authorName,
            authorId: user._id || user.id,
            author: user._id || user.id // إرسالها مرتين للتوافق
        };
        
        // 🔍 إضافة email إذا كان مطلوباً
        if (user.email) {
            storyData.authorEmail = user.email;
        }

        console.log('📤 بيانات الإرسال النهائية:', storyData);

        try {
            // 📤 الإرسال إلى الخادم
            const response = await fetch('http://localhost:5000/api/stories', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(storyData)
            });

            // 📥 معالجة الاستجابة
            const responseText = await response.text();
            console.log('📥 استجابة الخادم:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch {
                result = { raw: responseText };
            }

            if (!response.ok) {
                let errorMessage = `خطأ ${response.status}: `;
                
                if (result.message) {
                    errorMessage += result.message;
                } else if (result.raw) {
                    errorMessage += result.raw;
                } else if (result.errors) {
                    const errors = Object.values(result.errors).map(err => err.message || err);
                    errorMessage += errors.join(', ');
                } else if (result._message) {
                    errorMessage += result._message;
                } else {
                    errorMessage += 'حدث خطأ غير معروف';
                }
                
                throw new Error(errorMessage);
            }

            // ✅ النجاح
            console.log('✅ تم بنجاح:', result);
            
            // إغلاق النافذة وإعادة التعيين
            closeFormModal();
            storyForm.reset();
            
            // عرض رسالة النجاح
            Swal.fire({
                icon: 'success',
                title: 'تم بنجاح!',
                html: `<div style="text-align: center; direction: rtl;">
                    <h3>شكراً لمشاركتك!</h3>
                    <p>تم نشر قصتك بنجاح</p>
                    <p style="font-size: 14px; color: #666; margin-top: 10px;">
                        يمكنك رؤية قصتك في صفحة القصص
                    </p>
                </div>`,
                confirmButtonText: 'حسناً',
                timer: 3000,
                showConfirmButton: true
            });
            
            // تحديث القصص والإحصائيات
            setTimeout(() => {
                loadStories();
                loadStats();
            }, 1500);
            
        } catch (error) {
            console.error('❌ تفاصيل الخطأ:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'فشل في الإرسال',
                html: `<div style="text-align: right; direction: rtl;">
                    <h4>${error.message}</h4>
                    <p style="font-size: 14px; color: #666; margin-top: 10px;">
                        تأكد من:<br>
                        1. اتصال الإنترنت<br>
                        2. صحة البيانات المدخلة<br>
                        3. أنك مسجل الدخول
                    </p>
                </div>`,
                confirmButtonText: 'حسناً'
            });
        }
    });
}

    // تطبيق autoDirection على المدخلات
    const storyTitleInput = document.getElementById('storyTitle');
    const storyContentInput = document.getElementById('storyContent');
    
    // يجب التأكد من تعريف الدالة autoDirection في مكان ما
    if (storyTitleInput) autoDirection(storyTitleInput);
    if (storyContentInput) autoDirection(storyContentInput);

    // تحديث مستمعي الأحداث للبطاقات
    document.querySelectorAll('.read-more').forEach(button => {
        button.addEventListener('click', function() {
            const storyId = this.getAttribute('data-story');
            openStoryModal(storyId);
        });
    });
});

// إضافة مستمع حدث لإغلاق النافذة بالزر ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeStoryModal();
});

// دالة لجلب قيمة id من الرابط
function getStoryIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function displayStoryFromURL() {
    const storyId = getStoryIdFromURL();
    if (storyId) openStoryModal(storyId);
}

window.addEventListener('DOMContentLoaded', function() {
    displayStoryFromURL();
});