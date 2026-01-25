document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    if (menuToggle) {
        menuToggle.addEventListener("click", function (e) {
            e.stopPropagation();
            navLinks.classList.toggle("active");
        });
    }


    document.addEventListener("click", function (e) {
        if (!e.target.closest(".navbar")) {
            navLinks.classList.remove("active");
            document.querySelectorAll(".dropdown").forEach((dropdown) => {
                dropdown.classList.remove("active");
            });
        }
    });


    if (navLinks) {
        navLinks.addEventListener("click", function (e) {
            e.stopPropagation();
        });

    }

    document.querySelectorAll(".dropdownToggle").forEach((item) => {
        item.addEventListener("click", function (e) {
            if (window.innerWidth <= 992) {
                e.preventDefault();
                const dropdown = this.parentNode;
                dropdown.classList.toggle("active");

                document.querySelectorAll(".dropdown").forEach((d) => {
                    if (d !== dropdown) {
                        d.classList.remove("active");
                    }
                });
            }
        });
    });

    window.addEventListener("resize", function () {
        if (window.innerWidth > 992) {
            navLinks.classList.remove("active");
            document.querySelectorAll(".dropdown").forEach((dropdown) => {
                dropdown.classList.remove("active");
            });
        }
    });

    
});

// دالة لتحميل HTML مع الحفاظ على فعالية السكربتات
    async function loadHTML(file, elementId) {
        try {
            const response = await fetch(file);
            const data = await response.text();
            const container = document.getElementById(elementId);
            container.innerHTML = data;
            
            // إعادة تهيئة الأحداث للعناصر المنقولة
            if (file === 'navbar.html') {
                initNavbar();
            } 
            
            return true;
        } catch (error) {
            console.error('Error loading HTML:', error);
            return false;
        }
    }

    // دالة لتهيئة أحداث النافبار
    function initNavbar() {
        const menuToggle = document.getElementById('menuToggle');
        const navLinks = document.getElementById('navLinks');
        
        if (!menuToggle || !navLinks) return;
        
        // تبديل القائمة في الجوال
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            navLinks.classList.toggle('active');
        });
        
        // إغلاق القائمة عند النقر خارجها
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.navbar')) {
                navLinks.classList.remove('active');
                document.querySelectorAll('.dropdown').forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
            }
        });
        
        // منع إغلاق القائمة عند النقر عليها
        if (navLinks) {
            navLinks.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
        
        // تفعيل dropdown في الشاشات الصغيرة
        document.querySelectorAll('.dropdownToggle').forEach(item => {
            item.addEventListener('click', function(e) {
                if (window.innerWidth <= 992) {
                    e.preventDefault();
                    const dropdown = this.parentNode;
                    dropdown.classList.toggle('active');
                    
                    // إغلاق باقي القوائم
                    document.querySelectorAll('.dropdown').forEach(d => {
                        if (d !== dropdown) {
                            d.classList.remove('active');
                        }
                    });
                }
            });
        });

        updateAuthLabels();
        
        // إغلاق القوائم المنسدلة عند تغيير حجم النافذة
        window.addEventListener('resize', function() {
            if (window.innerWidth > 992) {
                if (navLinks) navLinks.classList.remove('active');
                document.querySelectorAll('.dropdown').forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
            }
        });
    }

    // تحميل العناصر عند بدء التشغيل
    window.addEventListener('DOMContentLoaded', function() {
        loadHTML('navbar.html', 'navbar-placeholder');
        loadHTML('footer.html', 'footer-placeholder');
    });


// Check if user is logged in
    function checkAuthStatus() {
        console.log('Checking auth status...');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

        console.log('Token:', token ? 'Found' : 'Not found');
        console.log('User data:', userStr ? 'Found' : 'Not found');

        const loginLink = document.getElementById('loginLink');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                // User is logged in
                if (loginLink) {
                    loginLink.style.display = 'none';
                }

                if (userInfo) {
                    userInfo.style.display = 'flex';
                }
                if (userName) {
                    userName.textContent = `مرحباً، ${user.firstName}`;
                }
                console.log('UI updated to show logout button');
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        } else {
            // User is not logged in
            console.log('User not logged in - showing login link');
            if (loginLink) {

                loginLink.style.display = 'block';
            }
            if (userInfo) {
                userInfo.style.display = 'none';
            }
        }

    }

function updateAuthLabels() {
        // Check auth status on page load
        checkAuthStatus();


        // Logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                // Clear auth data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');

                // Redirect to home page
                window.location.href = 'HomePage.html';
            });
        }
}