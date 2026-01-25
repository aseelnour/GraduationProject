// JavaScript for Arabic Reset Password Page

document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    
    // Modals
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const successBtn = document.getElementById('successBtn');

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // If no token, show error and redirect
    if (!token) {
        errorMessage.textContent = 'رابط غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد لإعادة تعيين كلمة المرور.';
        errorModal.show();
        
        setTimeout(() => {
            window.location.href = 'forgot-password.html';
        }, 3000);
    }

    // Arabic messages
    const messages = {
        buttons: {
            resetting: 'جاري التعيين...',
            reset: 'تعيين كلمة المرور'
        },
        success: {
            reset: 'تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
        },
        errors: {
            passwordMismatch: 'كلمة المرور وتأكيد كلمة المرور غير متطابقين',
            passwordTooShort: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل',
            invalidToken: 'رابط غير صالح أو منتهي الصلاحية',
            serverError: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً'
        },
        validation: {
            fieldRequired: 'هذا الحقل مطلوب'
        }
    };

    // Toggle password visibility
    togglePasswordBtn.addEventListener('click', function() {
        const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        newPasswordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    toggleConfirmPasswordBtn.addEventListener('click', function() {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // Form validation
    function validateForm() {
        let isValid = true;
        
        // Remove previous validation classes
        newPasswordInput.classList.remove('is-valid', 'is-invalid');
        confirmPasswordInput.classList.remove('is-valid', 'is-invalid');
        
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        
        // Validate new password
        if (newPassword === '') {
            newPasswordInput.classList.add('is-invalid');
            isValid = false;
        } else if (newPassword.length < 6) {
            newPasswordInput.classList.add('is-invalid');
            isValid = false;
            alert(messages.errors.passwordTooShort);
        } else {
            newPasswordInput.classList.add('is-valid');
        }
        
        // Validate confirm password
        if (confirmPassword === '') {
            confirmPasswordInput.classList.add('is-invalid');
            isValid = false;
        } else if (confirmPassword !== newPassword) {
            confirmPasswordInput.classList.add('is-invalid');
            isValid = false;
            alert(messages.errors.passwordMismatch);
        } else {
            confirmPasswordInput.classList.add('is-valid');
        }
        
        return isValid;
    }

    // Form submission handler
    resetPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // Show loading state
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm ms-2"></span>${messages.buttons.resetting}`;
            submitBtn.disabled = true;
            
            try {
                const response = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        password: newPasswordInput.value
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Store token if returned
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                    }
                    
                    successMessage.textContent = messages.success.reset;
                    successModal.show();
                    
                    // Clear form
                    this.reset();
                } else {
                    // Show error
                    errorMessage.textContent = data.message || messages.errors.invalidToken;
                    errorModal.show();
                }
            } catch (error) {
                console.error('Error:', error);
                errorMessage.textContent = messages.errors.serverError;
                errorModal.show();
            } finally {
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    });

    // Success button redirects to login
    successBtn.addEventListener('click', function() {
        window.location.href = 'login.html';
    });

    // Real-time validation
    confirmPasswordInput.addEventListener('input', function() {
        if (this.value === newPasswordInput.value && this.value.length >= 6) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else if (this.value.length > 0) {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
        } else {
            this.classList.remove('is-valid', 'is-invalid');
        }
    });

    newPasswordInput.addEventListener('input', function() {
        if (this.value.length >= 6) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
            
            // Also revalidate confirm password if it has a value
            if (confirmPasswordInput.value.length > 0) {
                if (confirmPasswordInput.value === this.value) {
                    confirmPasswordInput.classList.remove('is-invalid');
                    confirmPasswordInput.classList.add('is-valid');
                } else {
                    confirmPasswordInput.classList.remove('is-valid');
                    confirmPasswordInput.classList.add('is-invalid');
                }
            }
        } else if (this.value.length > 0) {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
        } else {
            this.classList.remove('is-valid', 'is-invalid');
        }
    });

    // RTL-specific enhancements
    const inputs = document.querySelectorAll('input[type="password"]');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            setTimeout(() => {
                if (this.value === '') {
                    this.style.textAlign = 'right';
                }
            }, 10);
        });
    });
});
