// وظيفة لتحميل HTML
async function loadHTML(file, elementId) {
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.text();
        const container = document.getElementById(elementId);
        if (!container) throw new Error(`Element with id '${elementId}' not found`);
        container.innerHTML = data;

        if (file === 'navbar.html') initNavbar();
        return true;
    } catch (error) {
        console.error('Error loading HTML:', error);
        return false;
    }
}

// تأثير انتقال الصفحات
document.addEventListener('DOMContentLoaded', function() {
    document.body.style.opacity = 1;
    document.body.style.transition = 'opacity 0.5s';
    
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            // تجاهل الروابط التي تفتح في نافذة جديدة أو لا تؤدي إلى صفحات HTML
            if (this.target === '_blank' || 
                this.href.startsWith('javascript:') || 
                this.href.startsWith('mailto:') || 
                this.href.startsWith('tel:')) {
                return;
            }
            
            e.preventDefault();
            const url = this.href;
            document.body.style.opacity = 0;
            setTimeout(() => { window.location.href = url; }, 500);
        });
    });
});

// تهيئة شريط التنقل
function initNavbar() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (!menuToggle || !navLinks) return;

    menuToggle.addEventListener('click', e => {
        e.stopPropagation();
        navLinks.classList.toggle('active');
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.navbar')) {
            navLinks.classList.remove('active');
            document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
        }
    });

    navLinks.addEventListener('click', e => e.stopPropagation());

    document.querySelectorAll('.dropdown-toggle').forEach(item => {
        item.addEventListener('click', e => {
            if (window.innerWidth <= 992) {
                e.preventDefault();
                const dropdown = item.parentNode;
                dropdown.classList.toggle('active');
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });
            }
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            navLinks.classList.remove('active');
            document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
        }
    });
}



// وظيفة لتحديد ما إذا كانت الحالة عاجلة بناءً على الموعد النهائي
function isUrgent(deadline) {
    if (!deadline) return false;
    
    try {
        let deadlineDate;
        
        if (deadline instanceof Date) {
            deadlineDate = new Date(deadline);
        } else if (typeof deadline === 'string') {
           
            const dateStr = deadline.split('T')[0]; 
            const [year, month, day] = dateStr.split('-').map(Number);
            deadlineDate = new Date(year, month - 1, day);
        } else {
            deadlineDate = new Date(deadline);
        }
        
        if (isNaN(deadlineDate.getTime())) {
            return false;
        }
        
        const today = new Date();
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const deadlineLocal = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
        
        const diffTime = deadlineLocal - todayLocal;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= 20 && diffDays >= 0;
    } catch (error) {
        console.error('Error calculating urgency:', error);
        return false;
    }
}

function getTypeName(type) {
    const typeNames = {
        "education": "التعليم",
        "health": "الصحة",
        "living": "المعيشة",
        "sponsoring": "الكفالة",
        "emergency": "الطوارئ",
        "other": "أخرى"
    };
    return typeNames[type] || "أخرى";
}


// دالة لفتح صفحة التفاصيل
function openCaseDetails(caseId) {
    console.log('Opening case details for ID:', caseId);
    
    if (!caseId || caseId === 'undefined' || caseId === 'null') {
        console.error('Invalid case ID:', caseId);
        alert('خطأ في تحميل الحالة: لم يتم تحديد معرف الحالة');
        return;
    }
    
    window.location.href = `casedetails.html?id=${caseId}`;
}

// دالة لفتح صفحة التبرع
function openDonationPage(caseId) {
    console.log('Opening donation page for ID:', caseId);
    
    if (!caseId || caseId === 'undefined' || caseId === 'null') {
        console.error('Invalid case ID for donation:', caseId);
        alert('خطأ في فتح صفحة التبرع');
        return;
    }
    
    window.location.href = `DonateNow.html?id=${caseId}`;
}

// وظيفة لتحميل الحالات وعرضها
async function loadCases(filterType = 'all', sortType = 'default', searchTerm = '') {
    const container = document.getElementById("casesContainer");
    if (!container) {
        console.error("casesContainer element not found");
        return;
    }
    
    container.innerHTML = '<div class="loading">جاري تحميل الحالات...</div>';
    
    try {
        // Build query parameters
        const params = new URLSearchParams();
        if (filterType && filterType !== 'all') {
            params.append('type', filterType);
        }
        if (sortType && sortType !== 'default') {
            params.append('sort', sortType);
        }
        if (searchTerm && searchTerm.trim()) {
            params.append('search', searchTerm.trim());
        }
        
        const url = `api/donation-requests${params.toString() ? '?' + params.toString() : ''}`;
        console.log('Fetching from:', url);
        
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
       const responseJson = await res.json();
        
        console.log("API Response:", responseJson);
        const casesData = responseJson.data || responseJson;

        container.innerHTML = '';
        
        if (!casesData || casesData.length === 0) {
            container.innerHTML = '<div class="no-cases" style="background-color: wheit;">لا توجد حالات متاحة حالياً</div>';
            return;
        }


function formatDateForDisplay(dateString) {
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

   casesData.forEach(c => {
    // Handle both 'deadline' field from DonationRequest or old structure
    const deadline = c.dynamicFields?.deadline || c.deadline;
    const urgent = c.urgencyLevel === 'critical' || c.urgencyLevel === 'high' || isUrgent(deadline);
    const formattedDeadline = formatDateForDisplay(deadline);

    const remaining = (c.totalAmount || 0) - (c.totalDonations || 0);
    const percent = c.totalAmount > 0 ? Math.floor((c.totalDonations / c.totalAmount) * 100) : 0;

    const caseId = c._id || c.id;
    const caseType = c.requestType || c.type;
    
    // Get image - use default based on type if not available
    const getDefaultImage = (type) => {
        const images = {
            'health': 'images/operation.png',
            'education': 'images/student.jpg',
            'living': 'images/homes.jpg',
            'sponsoring': 'images/fatherAndSon.jpg',
            'emergency': 'images/تنزيل.jpg'
        };
        return images[type] || 'images/default-case.jpg';
    };
    
    const imageUrl = c.image || getDefaultImage(caseType);

    const card = document.createElement("div");
    card.className = "case"; 
    card.setAttribute("data-type", caseType);
    card.setAttribute("data-urgent", urgent);
    card.setAttribute("data-total", c.totalAmount || 0);
    card.setAttribute("data-donated", c.totalDonations || 0);
    card.setAttribute("data-remaining", remaining);
    card.setAttribute("data-id", caseId);

    card.innerHTML = `
        ${urgent ? '<span class="urgent-label">عاجل</span>' : ""}
        <span class="case-badge ${caseType}-badge">${getTypeName(caseType)}</span>
        <img src="${imageUrl}" alt="${c.title}" class="case-image" onerror="this.src='images/default-case.jpg'" />
        <div class="case-content">
            <h3>${c.title}</h3> 
            <p>المبلغ المطلوب: ${c.totalAmount || 0} ₪ </p>
            <p>المبلغ المتبقي: <span class="remaining">${remaining}</span> ₪ </p>
            <div class="progress-container">
                <div class="progress-bar" style="width:${percent}%;"></div>
            </div>
            <p>نسبة الإنجاز: <span class="percentage">${percent}%</span></p>
            ${formattedDeadline ? `<p class="deadline">الموعد النهائي: ${formattedDeadline}</p>` : ''}
            
            <div class="case-actions">
                <button class="btn-donate" onclick="window.location.href='DonateNow.html?id=${caseId}'">
                    <i class="fas fa-hand-holding-heart"></i> تبرع الآن
                </button>
                <button class="btn-details" onclick="window.location.href='casedetails.html?id=${caseId}'">
                    <i class="fas fa-eye"></i> التفاصيل
                </button>
            </div>
        </div>
    `;
    container.appendChild(card);
});


        initFilterSortSearch(); 

    } catch(err) {
        console.error("Error loading cases:", err);
        container.innerHTML = '<div class="error">حدث خطأ أثناء تحميل الحالات. يرجى المحاولة مرة أخرى.</div>';
    }
}


// تهيئة الفلترة والترتيب والبحث
function initFilterSortSearch() {
    const filterOptions = document.querySelector('.filter-options');
    const sortOptions = document.querySelector('.sort-options');
    const searchInput = document.querySelector('.search-box input');

    if (!filterOptions || !sortOptions || !searchInput) {
        console.warn("Filter, sort, or search elements not found");
        return;
    }

    filterOptions.addEventListener('click', e => {
        if(e.target.classList.contains('filter-btn')){
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            applyFiltersAndSort();
        }
    });

    sortOptions.addEventListener('click', e => {
        if(e.target.classList.contains('sort-btn')){
            document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            applyFiltersAndSort();
        }
    });

    // Debounce search input to avoid too many API calls
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFiltersAndSort();
        }, 500); // Wait 500ms after user stops typing
    });
}

// Apply filters and sort by reloading data from backend
function applyFiltersAndSort() {
    const activeFilter = document.querySelector('.filter-btn.active');
    const activeSort = document.querySelector('.sort-btn.active');
    const searchInput = document.querySelector('.search-box input');
    
    const filterValue = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
    const sortValue = activeSort ? activeSort.getAttribute('data-sort') : 'default';
    const searchTerm = searchInput ? searchInput.value : '';
    
    console.log('Applying filters:', { filterValue, sortValue, searchTerm });
    loadCases(filterValue, sortValue, searchTerm);
}

// بيانات الأسئلة الشائعة
const faq = {
    "كيف أتبرع؟": "للتبرع، يمكنك اختيار حالة من القائمة والنقر على زر 'تبرع الآن'، ثم اتباع خطوات الدفع.",
    "ما هي طرق الدفع المتاحة؟": "نقبل بطاقات الائتمان، PayPal، والمحفظه الالكترونيه والحوالات البنكية.",
    "هل التبرع آمن؟": "نعم، جميع عمليات التبرع مؤمنة بتقنية SSL ولا نخزن بيانات بطاقتك.",
    "كيف أتأكد من وصول تبرعي؟": "ستصلك إشعارات وتقارير عن الحالة التي تبرعت لها.",
    "كيف يتم استخدام تبرعاتي؟": "تبرعاتك تُخصص بالكامل للغرض الذي تبرعت من أجله.",
    "ماذا لو حدث خطأ أثناء عملية التبرع؟": "يرجى التواصل معنا على الرقم الموجود أسفل الصفحة."
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

// تهيئة الصفحة عند التحميل
document.addEventListener("DOMContentLoaded", () => {
    loadHTML('navbar.html','navbar-placeholder');
    loadHTML('footer.html','footer-placeholder');
    loadCases();
});