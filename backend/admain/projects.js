
let isAdmin = false;
let allProjects = []; // نخزن كل المشاريع هنا بعد جلبها

// جلب المستخدم الحالي من الباك
async function getCurrentUser() {
  const token = localStorage.getItem('token')|| sessionStorage.getItem('token');
  if (!token) return null;

  try {
    const res = await fetch('http://localhost:5000/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.user; // { firstName, role, ... }
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

// تحديث ظهور أزرار الأدمن
function updateAdminVisibility() {
  const adminSections = document.querySelectorAll('.admin-actions, #add-project');
  adminSections.forEach(section => {
    if (isAdmin) section.classList.remove('d-none');
    else section.classList.add('d-none');
  });
}

// عرض المشاريع في الصفحة
function renderProjects(projects) {
  const projectsContainer = document.getElementById('projects');
  const completedContainer = document.getElementById('completed-projects');

  projectsContainer.innerHTML = '';
  completedContainer.innerHTML = '';

  projects.forEach(project => {
    const progressPercent = project.goalAmount
      ? Math.min((project.collectedAmount / project.goalAmount) * 100, 100)
      : 0;
    const isCompleted = progressPercent >= 100|| project.status === 'مكتمل';

    const projectCard = document.createElement('div');
    projectCard.className = 'col-lg-4 col-md-6 mb-4 card-box ';
    projectCard.setAttribute('data-id', project._id);

    projectCard.setAttribute('data-filter', project.category);

    projectCard.innerHTML = `
      <div class="card shadow-sm border-0 position-relative">
        <img src="${project.mainImage.secure_url || 'images/default_project.jpg'}" class="mx-3 mt-3 rounded-3" alt="صورة المشروع">
        ${project.isUrgent ? `
        <div style="position: absolute; top: 17px; right: 24px;">
          <span class="badge bg-danger">عاجل</span>
        </div>` : ''}
        <div style="position: absolute; top: 17px; left: 19px;">
          <span class="badge bg-info border border-2 rounded-4">${project.category}</span>
        </div>
        <div class="card-body text-center">
          <h5 class="card-title title">${project.title}</h5>
          <p class="card-text small text-muted">${project.description}</p>
          <div class="progress mb-1" style="height: 13px; border-radius: 5px;">
            <div class="progress-bar bg-primary" role="progressbar" style="width: ${progressPercent}%;">${Math.round(progressPercent)}%</div>
          </div>
          <div class="bg-light money d-flex mt-3 p-2 rounded justify-content-between flex-wrap">
            <div>
              <span class="mb-1 text-primary">المبلغ المطلوب</span>
              <p>${project.goalAmount}<small>₪</small></p>
            </div>
            <div>
              <span class="mb-1 text-primary">تم جمع</span>
              <p>${project.collectedAmount}<small>₪</small></p>
            </div>
            <div>
              <span class="mb-1 text-primary">المبلغ المتبقي</span>
              <p>${project.goalAmount - project.collectedAmount}<small>₪</small></p>
            </div>
          </div>
          <span class="badge ${isCompleted ? 'bg-success' : 'bg-warning text-white'} mt-2 p-2">
            ${isCompleted ? 'مكتمل' : 'قيد التنفيذ'}
          </span>
          <div class="mt-3 border-top w-100 project-details">
            <a href="project-details.html?id=${project._id}" class="p-2 d-block">تفاصيل المشروع</a>
          </div>
          <div class="admin-actions d-none admin-only border-top pt-2 d-flex justify-content-center gap-2">
            <button class="btn btn-sm p-2 btn-primary edit-project-btn "  data-action="edit" title="تعديل"><span>تعديل</span><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm p-2 btn-danger delete-project" title="حذف"><span>حذف</span><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;

    if (isCompleted) completedContainer.appendChild(projectCard);
    else projectsContainer.appendChild(projectCard);
  });

  // بعد عرض المشاريع، تحديث ظهور أزرار الأدمن
  updateAdminVisibility();
}




// دالة لتطبيق الفلترة والبحث والترتيب
function filterSortSearchProjects() {
  let filtered = [...allProjects];

  // فلترة حسب النوع
  const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  if (activeFilter !== 'all') {
    filtered = filtered.filter(p => {
      // تحويل القيم العربية/إنجليزية حسب ما عندك
      switch (activeFilter) {
        case 'health': return p.category === 'صحية';
        case 'education': return p.category === 'تعليمية';
        case 'living': return p.category === 'معيشية';
        case 'orphans': return p.category === 'رعاية أيتام';
        default: return true;
      }
    });
  }

  // بحث نصي
  const searchText = document.getElementById('search').value.trim().toLowerCase();
  if (searchText) {
    filtered = filtered.filter(p => p.title.toLowerCase().includes(searchText) || p.description.toLowerCase().includes(searchText));
  }
//++++++++++++++++++++++++++++++++++
  // ترتيب
  const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort || 'default';
  switch (activeSort) {
    case 'oldest':
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    break;
    case 'urgent':
       filtered.sort((a, b) => (b.isUrgent === true) - (a.isUrgent === true));
  case 'default': // الأحدث أولًا
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    break;
    case 'remaining':
      filtered.sort((a, b) => 
  (Number(a.goalAmount) - Number(a.collectedAmount)) - (Number(b.goalAmount) - Number(b.collectedAmount))
);
  break;
    default: // الأحدث
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  renderProjects(filtered);
}
// فلترة
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterSortSearchProjects();
  });
});

// ترتيب
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterSortSearchProjects();
  });
});

// بحث نصي
document.getElementById('search').addEventListener('input', () => {
  filterSortSearchProjects();
});



let currentProject = null; 

document.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-action="edit"]');
  if (!editBtn) return;

  const card = editBtn.closest('.card-box');
  const projectId = card.dataset.id;

  document.getElementById('save-edit').dataset.id = projectId;

  // جلب المشروع من السيرفر
  try {
    const res = await fetch(`http://localhost:5000/api/project/${projectId}`);
    const data = await res.json();

currentProject = data.project; 

    document.getElementById('edit-title').value = currentProject.title;
    document.getElementById('edit-description').value = currentProject.description;
    document.getElementById('edit-goals').value = currentProject.goals;
    document.getElementById('edit-amount').value = currentProject.goalAmount;
    document.getElementById('edit-category').value = currentProject.category;
document.getElementById('edit-urgent').checked = !!currentProject.isUrgent;
document.getElementById('edit-desc').value = currentProject.details;


    const modal = new bootstrap.Modal(
      document.getElementById('editProjectModal')
    );
    modal.show();

  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء جلب بيانات المشروع');
  }
});

document.getElementById('save-edit').addEventListener('click', async () => {
   
  const id = document.getElementById('save-edit').dataset.id;

  const formData = new FormData();
  formData.append('title', document.getElementById('edit-title').value);
  formData.append('category', document.getElementById('edit-category').value);
  formData.append('description', document.getElementById('edit-description').value);
  formData.append('goals', document.getElementById('edit-goals').value);
  formData.append('goalAmount', Number(document.getElementById('edit-amount').value));
formData.append('isUrgent', document.getElementById('edit-urgent').checked);
formData.append('details', document.getElementById('edit-desc').value);


  const imageInput = document.getElementById('edit-image');
 if (imageInput.files.length > 0) {
  formData.append('mainImage', imageInput.files[0]);
}

const subImagesInput = document.getElementById('edit-sub-images');

if (subImagesInput.files.length > 0) {
  for (let i = 0; i < subImagesInput.files.length; i++) {
    formData.append('subImages', subImagesInput.files[i]);
  }
}

  try {
    const res = await fetch(`http://localhost:5000/api/project/${id}`, {
      method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")|| sessionStorage.getItem('token')}` },
      
      body: formData
    });

    if (!res.ok) throw new Error('فشل التعديل');

    alert('تم تعديل المشروع بنجاح');
    fetchProjects(); // تحديث الصفحة
    bootstrap.Modal.getInstance(
      document.getElementById('editProjectModal')
    ).hide();

  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء التعديل');
  }
});

document.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('button.delete-project');
  if (!deleteBtn) return;

  const card = deleteBtn.closest('.card-box');
  const projectId = card?.dataset.id;

  if (!projectId) {
    Swal.fire('خطأ', 'لم يتم العثور على المشروع', 'error');
    return;
  }

  const result = await Swal.fire({
    title: 'هل أنت متأكد؟',
    text: 'لن تتمكن من التراجع عن الحذف!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d'
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`http://localhost:5000/api/project/${projectId}`, {
      method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")|| sessionStorage.getItem('token')}` }
      
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    await Swal.fire({
      title: 'تم الحذف',
      text: 'تم حذف المشروع بنجاح',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });

    card.remove();

  } catch (error) {
    Swal.fire('خطأ', 'فشل حذف المشروع', 'error');
  }
  });


// جلب المشاريع من الباك
async function fetchProjects() {
  try {
    const res = await fetch('http://localhost:5000/api/project');
    if (!res.ok) throw new Error('Failed to fetch projects');
    const data = await res.json();

    console.log('Data from API:', data); // للتأكد

    allProjects = data.projects; // نخزن كل المشاريع
    filterSortSearchProjects();  // نطبق الفلترة/البحث/الترتيب عند أول تحميل
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
}
document.getElementById('addProjectForm').addEventListener('submit', async (e) => {
  e.preventDefault(); // منع تحديث الصفحة

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (new Date(startDate) > new Date(endDate)) {
    alert('تاريخ البداية يجب أن يكون قبل تاريخ النهاية!');
    return; // يمنع الإرسال
  }

  const formData = new FormData();
  formData.append('title', document.getElementById('add-title').value);
  formData.append('category', document.getElementById('add-category').value);
  formData.append('description', document.getElementById('add-description').value);
  formData.append('details', document.getElementById('add-details').value);
  formData.append('goals', document.getElementById('add-goals').value);
  formData.append('goalAmount', Number(document.getElementById('add-amount').value));
  formData.append('isUrgent', document.getElementById('urgent').checked);
  formData.append('startDate', document.getElementById('startDate').value);
  formData.append('endDate', document.getElementById('endDate').value);

  // الصورة الرئيسية
  const mainImage = document.getElementById('add-main-image');
  if (mainImage.files.length > 0) {
    formData.append('mainImage', mainImage.files[0]);
  }

  // الصور الفرعية
  const subImages = document.getElementById('add-sub-images');
  if (subImages.files.length > 0) {
    for (const file of subImages.files) {
      formData.append('subImages', file);
    }
  }

  try {
    const res = await fetch('http://localhost:5000/api/project', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem("token")|| sessionStorage.getItem('token')}` },
      
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'فشل إضافة المشروع');
    }

    const data = await res.json();
    alert('تم إضافة المشروع بنجاح');
    
    fetchProjects(); // تحديث قائمة المشاريع
    bootstrap.Modal.getInstance(document.getElementById('addProjectModal')).hide();
    document.getElementById('addProjectForm').reset(); // إعادة تعيين الفورم

  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء إضافة المشروع: ' + err.message);
  }
});



// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  isAdmin = user?.role === 'admin'
  await fetchProjects();
});
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
