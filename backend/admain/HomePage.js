
/*======================================================================================================*/

// 🚨 (1) تم توحيد تعريف API_BASE_URL لضمان عمل جميع الدوال عليها
const API_BASE_URL = 'http://localhost:5000/api'; 
const TWENTY_DAYS_IN_MS = 20 * 24 * 60 * 60 * 1000;


// دالة 1: تحديد الإلحاح (Urgency Check) - مُعدلة للعمل على 20 يومًا (توحيد التعريف)
function isUrgent(deadlineDateString) {
    if (!deadlineDateString) return false;

    const deadline = new Date(deadlineDateString);
    const now = new Date();
    
    const timeRemaining = deadline.getTime() - now.getTime();
    
    return timeRemaining > 0 && timeRemaining <= TWENTY_DAYS_IN_MS;
}

// دالة 2: تنسيق التاريخ 

function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
}

// دالة 3: الحصول على اسم نوع الحالة 
function getTypeName(type) {
    const types = {
        "health": "صحية",
        "education": "تعليمية",
        "living": "معيشية",
        "orphans": "رعاية أيتام" ,
        "Emergency":"طوارئ"
    };
    return types[type] || "أخرى";
}

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

// دالة 4: اقتطاع النص (مستخدمة في قصص النجاح)
function getShortExcerpt(content, maxLength = 150) {
    if (!content) return 'لا يوجد محتوى';
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length <= maxLength ? plainText : plainText.substring(0, maxLength) + '...';
}


//**********************************swiper for cases-slider ******************************************************* */
async function loadUrgentCases() {
    const container = document.querySelector("#urgentCasesContainerSwiper .swiper-wrapper");
    const parentContainer = document.getElementById("urgentCasesContainerSwiper");
    
    if (!container || !parentContainer) {
        console.error("Swiper container elements not found");
        return;
    }

    container.innerHTML = '<div class="loading swiper-slide">جاري تحميل الحالات العاجلة...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/HomePage/urgent-cases`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        // الإصلاح: التحقق من هيكل البيانات بشكل صحيح
        const urgentCases = data.success ? data.data : (Array.isArray(data) ? data : []);
        
        container.innerHTML = '';

        if (!urgentCases || urgentCases.length === 0) {
            container.innerHTML = '<div class="no-cases swiper-slide">لا توجد حالات عاجلة متاحة حالياً</div>';
            parentContainer.style.display = 'none';
            return;
        }
        
        parentContainer.style.display = '';

        // بناء البطاقات
        urgentCases.forEach(c => {
            const remaining = c.total - (c.donated || 0);
            const percent = c.total > 0 ? Math.floor(((c.donated || 0) / c.total) * 100) : 0;
        const storyImage = c.image || getCategoryImage(c.category);

            const card = document.createElement("div");
            card.className = "swiper-slide case";
            card.innerHTML = `
                ${c.isUrgent ? '<span class="urgent-label">عاجل</span>' : ""}
                <span class="case-badge ${(c.type || 'general')}-badge">${getTypeName(c.type)}</span>
                <img src="${storyImage}" alt="صورة الحالة" class="case-image" >
                <div class="case-content">
                    <h3>${c.title || 'حالة بدون عنوان'}</h3>
                    <p>المبلغ المطلوب: ${c.total}₪</p>
                    <p>المبلغ المتبقي: <span class="remaining">${remaining}</span>₪</p>
                    <div class="progress-container">
                        <div class="progress-bar" style="width:${percent}%;"></div>
                    </div>
                    <p>نسبة الإنجاز: <span class="percentage">${percent}%</span></p>
                    <p class="deadline">الموعد النهائي: ${formatDate(c.deadline)}</p>
                    
                    <div class="case-actions">
                        <button class="btn-donate" onclick="window.location.href='DonateNow.html?id=${c._id || c.id}'">
                            <i class="fas fa-hand-holding-heart"></i> تبرع الآن
                        </button>
                        <button class="btn-details" onclick="window.location.href='casedetails.html?id=${c._id || c.id}'">
                            <i class="fas fa-eye"></i> التفاصيل
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // الإصلاح: تهيئة السلايدر بعد تحميل البيانات
        setTimeout(() => {
            if (typeof initializeSwiper === 'function') {
                initializeSwiper();
            }
        }, 100);

    } catch(err) {
        console.error("Error loading urgent cases:", err);
        container.innerHTML = '<div class="error swiper-slide">حدث خطأ أثناء تحميل الحالات العاجلة</div>';
    }
}

//****************************************swiper for stories******************************************************************** */
async function loadStories() {
    const swiperWrapper = document.querySelector('.testimonials-swiper .swiper-wrapper');
 if (!swiperWrapper) {
        console.error("Stories swiper wrapper not found");
        return;
    }
        
    swiperWrapper.innerHTML = '<div class="swiper-slide loading-story">جاري تحميل القصص...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/HomePage/success-stories`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const stories = data.success ? data.data : data;

        displayStoriesInSwiper(stories);

    } catch(error) {
        console.error('Error loading stories:', error);
        swiperWrapper.innerHTML = '<div class="swiper-slide error-story">حدث خطأ في تحميل القصص</div>';
    }
}

function displayStoriesInSwiper(stories) {
    const swiperWrapper = document.querySelector('.testimonials-swiper .swiper-wrapper');
    if (!swiperWrapper) return;

    swiperWrapper.innerHTML = '';

    if (!stories || stories.length === 0) {
         swiperWrapper.innerHTML = '<div class="swiper-slide no-stories">لا توجد قصص نجاح حالياً.</div>';
         return;
    }

    stories.forEach(story => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        
        // 💡 ملاحظة تحسين: استخدام دالة getShortExcerpt لضمان عرض محتوى مختصر ومناسب للسلايدر
        const storyExcerpt = getShortExcerpt(story.content, 150);
        const storyImage = story.image || getCategoryImage(story.category);

        slide.innerHTML = `
            <div class="testimonial-card">
                <div class="testimonial-text">
                    "${storyExcerpt}"
                    <div style="margin-top: 15px; text-align: left;">
                        <button class="read-more-btn"
                            onclick="window.location.href='stories.html?id=${story._id}'"
                            style="background: none; border: none; color: #2c5cc5; cursor: pointer; font-size: 14px; text-decoration: underline; padding: 0;">
                            اقرأ القصة كاملة
                        </button>
                    </div>
                </div>
                <div class="testimonial-author">
                    <img src="${storyImage}" alt="${story.title}" ">
                    <div class="author-info">
                        <h4>${story.title || 'قصة بدون عنوان'}</h4>
                        <p>${story.type === 'متبرع' ? 'متبرع' : 'مستفيد'} - ${story.category || 'عام'}</p>
                    </div>
                </div>
            </div>
        `;
        swiperWrapper.appendChild(slide);
    });

    // 💡 ملاحظة تحسين: تأكد من وجود الدالة قبل استدعائها
    if (typeof initTestimonialsSwiper === 'function') {
        initTestimonialsSwiper();
    }
}

/*======================================================================================================*/

// دالة لتحميل الإحصائيات من HomePage API
async function loadHomeStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/HomePage/stats`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.success) {
            updateStatsUI(data.data);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatsUI(stats) {
    const statElements = {

        'totalDonations': document.querySelector('.stat-box:nth-child(1) .stat-number'), 
        'totalDonationCount': document.querySelector('.stat-box:nth-child(2) .stat-number'), 
        'completedCasesCount': document.querySelector('.stat-box:nth-child(3) .stat-number'), 
        'totalDonors': document.querySelector('.stat-box:nth-child(4) .stat-number') 
    };

    if (statElements.totalDonations) {
        const formattedDonations = new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0
        }).format(stats.totalDonations || 0);

        statElements.totalDonations.textContent = formattedDonations.replace('ILS', '₪');
    }

    if (statElements.totalDonationCount) {
        statElements.totalDonationCount.textContent = `${(stats.totalDonationCount || 0).toLocaleString('ar-EG')}+`;
    }

    if (statElements.completedCasesCount) {
        statElements.completedCasesCount.textContent = `${(stats.completedCasesCount || 0).toLocaleString('ar-EG')}+`;
    }
    if (statElements.totalDonors) {
        statElements.totalDonors.textContent = `${(stats.totalDonors || 0).toLocaleString('ar-EG')}+`;
    }
}



// الدوال الخاصة بالـ Swiper (تبقى كما هي)
function initializeServicesSwiper() {
    new Swiper('.services-swiper', {
        slidesPerView: 'auto',
        spaceBetween: 25,
        loop: false,
        centeredSlides: false,
        
        navigation: {
            nextEl: '.services-swiper .swiper-button-next',
            prevEl: '.services-swiper .swiper-button-prev',
        },
        
        pagination: {
            el: '.services-swiper .swiper-pagination',
            clickable: true,
        },
        
        breakpoints: {
            320: { slidesPerView: 1.1, spaceBetween: 15 },
            480: { slidesPerView: 1.5, spaceBetween: 15 },
            640: { slidesPerView: 2, spaceBetween: 20 },
            768: { slidesPerView: 2.5, spaceBetween: 20 },
            1024: { slidesPerView: 3.5, spaceBetween: 25 },
            1200: { slidesPerView: 4, spaceBetween: 25 }
        }
    });
}

function initializeSwiper() {
    new Swiper('.cases-slider', {
        slidesPerView: 'auto', 
        spaceBetween: 25,
        loop: false,
        
        navigation: {
            nextEl: ".custom-next",
            prevEl: ".custom-prev",
        },
        
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        
        breakpoints: {
            320: { slidesPerView: 1.1, spaceBetween: 15 },
            768: { slidesPerView: 2.5, spaceBetween: 25 },
            1024: { slidesPerView: 3.5, spaceBetween: 25 }
        }
    });
}

function initTestimonialsSwiper() {
    if (typeof Swiper !== 'undefined') {
        return new Swiper('.testimonials-swiper', {
            loop: true,
            slidesPerView: 1,
            spaceBetween: 20,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                768: { slidesPerView: 2 },
                1024: { slidesPerView: 3 }
            }
        });
    }
    return null;
}

// ===========================================
// وظائف المشاركة (Share Functionality)
// ===========================================
function initializeShareModal() {
    // 🚨 (3) تم نقل هذه المتغيرات إلى داخل دالة Event Listener لضمان وجود العناصر
    const shareBtn = document.getElementById('shareBtn');
    const shareModal = document.getElementById('shareModal');
    const closeBtn = document.querySelector('.close-btn');
    const copyToast = document.getElementById('copyToast');

    if (!shareBtn || !shareModal || !closeBtn) {
         console.warn("Share modal elements not found.");
         return;
    }

    const shareData = {
        title: "حالة محتاجة للتبرع",
        text: "ساعد في نشر الخير بمشاركة هذه الحالة 🌸",
        url: window.location.href
    };

    // فتح المودال
    shareBtn.addEventListener('click', function() {
        shareModal.classList.add('show');
    });

    // إغلاق المودال
    closeBtn.addEventListener('click', function() {
        shareModal.classList.remove('show');
    });

    // إغلاق المودال عند الضغط خارج المحتوى
    shareModal.addEventListener('click', function(e) {
        if (e.target === shareModal) {
            shareModal.classList.remove('show');
        }
    });

    // زر واتساب
    document.getElementById('whatsapp-share')?.addEventListener('click', function(e) {
        e.preventDefault();
        const encodedText = encodeURIComponent(shareData.text + '\n' + shareData.url);
        window.open('https://wa.me/?text=' + encodedText, '_blank');
    });

    // زر فيسبوك
    document.getElementById('facebook-share')?.addEventListener('click', function(e) {
        e.preventDefault();
        const encodedUrl = encodeURIComponent(shareData.url);
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl, '_blank');
    });

    // زر نسخ الرابط
    document.getElementById('copy-link')?.addEventListener('click', async function(e) {
        e.preventDefault();
        try {
            await navigator.clipboard.writeText(shareData.url);
            
            // إظهار Toast وإخفاؤه
            if (copyToast) {
                 copyToast.classList.add('show');
                 setTimeout(() => copyToast.classList.remove('show'), 3000);
            }
            
            // إغلاق المودال
            setTimeout(() => shareModal.classList.remove('show'), 1000);
            
        } catch (err) {
            console.error('فشل في نسخ الرابط:', err);
            alert('تعذر نسخ الرابط، يرجى المحاولة مرة أخرى');
        }
    });
}


// ===========================================
// استدعاء الدوال عند تحميل الصفحة (Entry Point)
document.addEventListener("DOMContentLoaded", function() {
    // تحميل البيانات بالتسلسل لتجنب مشاكل الأداء
    Promise.all([
        loadUrgentCases(),
        loadStories(), 
        loadHomeStats()
    ]).then(() => {
        console.log("All home page data loaded successfully");
    }).catch(error => {
        console.error("Error loading home page data:", error);
    });
    
    initializeServicesSwiper();
    initializeShareModal();
});
/*======================================================================================================*/
   
   //*****************************************chatbot****************************************************************** */


// بيانات الأسئلة الشائعة
const faq = {
    "ما هي GiveHope؟": "GiveHope هي منصة خيرية إلكترونية تساعد على مد يد العون للمحتاجين بسرية وأمان , لتفاصيل اكتر يمكنك زباره صفحه من نحن اخر الصفحه ",
    "هل يمكنني التبرع بطرق غير مادية؟": "حاليا للاسف لا , التبرع فقط مادي لكن يمكنك المساعده عن طريق مشاركه الاحالات ونشر الخير",
   "هل يجب أن أسجل حساب للتبرع؟": "يمكنك تصفح الحالات دون تسجيل، لكن لإتمام التبرع تحتاج إلى إنشاء حساب بسيط",
"ما الفرق بين خدماتكم؟": "🔹 الحالات المعروضة: دعم أفراد أو أسر بحاجة لمساعدة محددة (مثل قسط جامعة، علاج، حليب أطفال...)\n🔹 حملات التبرع: مبادرات جماعية تهدف لتحقيق هدف معين خلال فترة زمنية محددة (مثل حملة الشتاء لتوزيع بطانيات)\n🔹 الكفالات: التزام طويل المدى لدعم شخص محدد بشكل دوري (مثل كفالة يتيم أو طالب)\n🔹 المشاريع: أعمال خيرية كبيرة تخدم مجموعة من الناس أو منطقة كاملة (مثل بناء بئر ماء أو تجهيز مركز صحي)"


};

// رسائل الترحيب للدردشة
const welcomeMessages = [
    "مرحباً! كيف يمكنني مساعدتك اليوم؟ 😊",
    "أهلاً بك! أنا هنا للإجابة على استفساراتك حول التبرع. 🤗",
    "مساء الخير! ما الذي يمكنني مساعدتك به اليوم؟ 🌟",
    "أهلاً! أسعدني تواصلك معنا. كيف يمكنني مساعدتك؟ 💙"
];

// وظائف الدردشة الآلية
function toggleChat() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    if (!chatbotWindow) return;
    
    if (chatbotWindow.style.display === 'flex') {
        chatbotWindow.classList.remove('active');
        setTimeout(() => { chatbotWindow.style.display = 'none'; }, 300);
    } else {
        chatbotWindow.style.display = 'flex';
        setTimeout(() => { chatbotWindow.classList.add('active'); }, 10);
        setTimeout(() => {
            const randomWelcome = welcomeMessages[Math.floor(Math.random()*welcomeMessages.length)];
            addBotMessage(randomWelcome);
        }, 500);
    }
}

function sendQuickReply(question) {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) typingIndicator.style.display = 'block';
    
    addUserMessage(question);
    
    setTimeout(() => {
        if (typingIndicator) typingIndicator.style.display = 'none';
        sendMessage(question);
    }, 1000);
}

function sendMessage(question) {
    let response = faq[question] || "عذرًا، لم أفهم سؤالك. يرجى اختيار أحد الأسئلة من القائمة أدناه. 🙏";
    addBotMessage(response);
}

function addUserMessage(msg) {
    const chatbotBody = document.getElementById('chatbotBody');
    if (!chatbotBody) return;
    
    const userMessage = document.createElement('div');
    userMessage.className = 'chatbot-message user-message';
    userMessage.textContent = msg;
    chatbotBody.appendChild(userMessage);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function addBotMessage(msg) {
    const chatbotBody = document.getElementById('chatbotBody');
    if (!chatbotBody) return;
    
    const botMessage = document.createElement('div');
    botMessage.className = 'chatbot-message bot-message';
    botMessage.textContent = msg;
    chatbotBody.appendChild(botMessage);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

// إغلاق الدردشة عند النقر خارجها
document.addEventListener('click', function(event) {
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotIcon = document.querySelector('.chatbot-icon');
    
    if (!chatbotWindow || !chatbotIcon) return;
    
    if (!chatbotWindow.contains(event.target) && !chatbotIcon.contains(event.target)) {
        if (chatbotWindow.style.display === 'flex') {
            chatbotWindow.classList.remove('active');
            setTimeout(() => { chatbotWindow.style.display = 'none'; }, 300);
        }
    }
});



        //*********************************************************************************************************** */

        // Animation on scroll
        const animateElements = document.querySelectorAll('.slide-up, .fade-in');
        
        function checkAnimation() {
            animateElements.forEach(element => {
                const elementPosition = element.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;
                
                if (elementPosition < windowHeight - 100) {
                    element.style.animationPlayState = 'running';
                }
            });
        }
        
        window.addEventListener('scroll', checkAnimation);
        window.addEventListener('load', checkAnimation);
        