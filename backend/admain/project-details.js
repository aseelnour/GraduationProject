
//عرض الصور المصغرة 
   function changeImage(element) {
      document.getElementById('mainImage').src = element.src;
      document.querySelectorAll('.thumbs img').forEach(img => img.classList.remove('active'));
      element.classList.add('active');
    }

  

    //مشاركة المشروع
  function copyLink() {
    const link = window.location.href; 
    navigator.clipboard.writeText(link).then(() => {
     
      const msg = document.createElement("div");
      msg.innerText = "✅ تم نسخ الرابط";
      msg.style.color = "green";
      msg.style.fontSize = "14px";
      msg.style.marginTop = "10px";

      const modalBody = document.querySelector("#shareModal .modal-body");
      modalBody.appendChild(msg);

      setTimeout(() => msg.remove(), 2000);
    });
  }


let isAdmin = false;


// =====================
// جلب المستخدم الحالي
// =====================
async function getCurrentUser() {
  const token = localStorage.getItem("token")|| sessionStorage.getItem('token');
    
  if (!token) return null;

  try {
    const res = await fetch("http://localhost:5000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch (err) {
    return null;
  }
}

// =====================
// فحص الأدمن
// =====================
async function checkAdmin() {
  const user = await getCurrentUser();
  isAdmin = !!(user?.role === "admin");
}

// =====================
// تحديث الواجهة
// =====================
function updateAdminUI() {
  document.querySelectorAll(".admin-actions, #adminControls").forEach(el => {
    if (isAdmin) el.classList.remove("d-none");
    else el.classList.add("d-none");
  });
}

// =====================
// تحميل الصفحة
// =====================
document.addEventListener("DOMContentLoaded", async () => {
  const projectId = new URLSearchParams(window.location.search).get("id");
  if (!projectId) {
    Swal.fire("خطأ", "لم يتم تحديد المشروع", "error");
    return;
  }

  await checkAdmin();
  await fetchProjectDetails(projectId);
  await fetchReports(projectId);
  updateAdminUI();
});

// =====================
// جلب تفاصيل المشروع
// =====================
async function fetchProjectDetails(projectId) {
  try {
    const res = await fetch(`http://localhost:5000/api/project/${projectId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    renderProject(data.project);
  } catch (err) {
    Swal.fire("خطأ", err.message, "error");
  }
}

// =====================
// عرض المشروع
// =====================
function renderProject(project) {
  const mainImageEl = document.getElementById("mainImage");
  const thumbsContainer = document.getElementById("subImagesContainer");
  thumbsContainer.innerHTML = "";

  // الصورة الرئيسية
  if (project.mainImage?.secure_url) {
    mainImageEl.src = project.mainImage.secure_url;

    const thumb = document.createElement("img");
    thumb.src = project.mainImage.secure_url;
    thumb.width = 100;
    thumb.classList.add("active");
    thumb.onclick = () => {
      mainImageEl.src = thumb.src;
      thumbsContainer.querySelectorAll("img").forEach(i => i.classList.remove("active"));
      thumb.classList.add("active");
    };
    thumbsContainer.appendChild(thumb);
  }

  // الصور الفرعية
  project.subImages?.forEach(img => {
    const imageEl = document.createElement("img");
    imageEl.src = img.secure_url;
    imageEl.width = 100;
    imageEl.onclick = () => {
      mainImageEl.src = img.secure_url;
      thumbsContainer.querySelectorAll("img").forEach(i => i.classList.remove("active"));
      imageEl.classList.add("active");
    };
    thumbsContainer.appendChild(imageEl);
  });

//---------- البيانات المالية ---------- 
const remaining = project.goalAmount - project.collectedAmount;
 const progress = project.goalAmount > 0 ? Math.round((project.collectedAmount / project.goalAmount) * 100) : 0; 
document.getElementById("goalAmount").textContent =` ${project.goalAmount} ₪`;
 document.getElementById("collectedAmount").textContent = `${project.collectedAmount} ₪`;
 document.getElementById("remainingAmount").textContent =` ${remaining} ₪`;
 document.getElementById("donorsCount").textContent =` ${project.donorsCount} `
 document.getElementById("details").textContent =` ${project.details} `
 document.getElementById("goals").textContent =` ${project.goals} `


 document.getElementById("createdAt").textContent = new Date(project.createdAt).toLocaleDateString("ar-EG"); 
document.getElementById("endDate").textContent = new Date(project.endDate).toLocaleDateString("ar-EG"); 
// ---------- الشريط التقدمي ----------
 const bar = document.querySelector(".progress-bar");
bar.style.width = `${progress}%`;
 bar.textContent =` ${progress}%`;
}

// =====================
// جلب التقارير
// =====================
async function fetchReports(projectId) {
  try {
    const res = await fetch(
      `http://localhost:5000/api/project/details/${projectId}/report`
    );
    const data = await res.json();

    const list = document.getElementById("reportsList");
    const noMsg = document.getElementById("noReportsMsg");
    list.innerHTML = "";

    if (!data.reports || data.reports.length === 0) {
      noMsg.style.display = "block";
      return;
    }

    noMsg.style.display = "none";

    data.reports.forEach(report => {
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";
li.innerHTML = `
  <span>📄${report.fileName} – <a href="${report.fileUrl}" download>تحميل PDF</a>
     <small class="me-3 text-muted">تم الرفع بتاريخ: ${new Date(report.uploadedAt).toLocaleDateString("ar-EG")}</small>
  </span>
  <div class="admin-actions ${isAdmin ? "" : "d-none"}" >
    <button class="btn btn-warning btn-sm edit-btn mx-1 text-white"><i class="fa-solid fa-pen-to-square"></i>تعديل</button>
    <button class="btn btn-danger btn-sm delete-btn text-white"><i class="fa-solid fa-trash"></i> حذف</button>
  </div>
`;
     

      if (isAdmin) {
        li.querySelector(".edit-btn").onclick = () => openEditModal(report._id, report.fileName);
        li.querySelector(".delete-btn").onclick = () => deleteReport(projectId, report._id, li);

      }

      list.appendChild(li);
    });
  } catch (err) {
    Swal.fire("خطأ", "فشل تحميل التقارير", "error");
  }
}

// =====================
// إضافة تقرير
// =====================
async function saveReport(projectId) {
    const title = document.getElementById("reportTitle").value.trim();
    const file = document.getElementById("reportFile").files[0];

    if (!title || !file) {
      Swal.fire("تنبيه", "الرجاء إدخال العنوان ورفع الملف", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("fileName", title);
    formData.append("report", file);

    try {
      const res = await fetch(
        `http://localhost:5000/api/project/details/${projectId}/report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")|| sessionStorage.getItem('token')}`,
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "فشل إضافة التقرير");

      Swal.fire("تم", "تم إضافة التقرير بنجاح", "success");

      // إعادة تحميل قائمة التقارير
      fetchReports(projectId);

      // مسح الفورم
      document.getElementById("reportForm").reset();

      // إغلاق المودال
      const modalEl = document.getElementById("addReportModal");
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.hide();

    } catch (err) {
      console.error(err);
      Swal.fire("خطأ", err.message || "فشل إضافة التقرير", "error");
    }
  }

  // ربط زر الحفظ
  document.getElementById("saveReportBtn").addEventListener("click", () => {
    const projectId = new URLSearchParams(window.location.search).get("id");
    saveReport(projectId);
  });


// =====================
// تعديل تقرير
// =====================

let editingReportId = null; 

function openEditModal(id, currentName) {
  editingReportId = id;
  document.getElementById("editReportTitle").value = currentName;
  new bootstrap.Modal(document.getElementById("editReportModal")).show();
}

async function updateReport() {
  const newName = document.getElementById("editReportTitle").value;
  const projectId = new URLSearchParams(window.location.search).get("id");

  if (!newName || !editingReportId || !projectId) {
    Swal.fire("تنبيه", "الرجاء إدخال اسم التقرير", "warning");
    return;
  }

  try {
    const res = await fetch(
      `http://localhost:5000/api/project/details/${projectId}/report/${editingReportId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")|| sessionStorage.getItem('token')}`,
        },
        body: JSON.stringify({ newName }) // 🔹 الاسم مطابق للسيرفر
      }
    );

    const data = await res.json();
    if (res.ok && data.message) {
      Swal.fire("تم", "تم تعديل التقرير بنجاح", "success");
      fetchReports(projectId); // إعادة تحميل التقارير بعد التعديل
      bootstrap.Modal.getInstance(document.getElementById("editReportModal")).hide();
    } else {
      throw new Error(data.message || "حدث خطأ غير معروف");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("خطأ", "فشل تعديل التقرير", "error");
  }
}

// ربط الزر بالمودال
document.getElementById("updateReportBtn").addEventListener("click", updateReport);


// =====================
// حذف تقرير (SweetAlert)
// =====================
async function deleteReport(projectId, reportId, li) {
  const result = await Swal.fire({
    title: "هل أنت متأكد؟",
    text: "لن يمكنك التراجع بعد الحذف",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "نعم، احذف",
    cancelButtonText: "إلغاء",
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(
      `http://localhost:5000/api/project/details/${projectId}/report/${reportId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")|| sessionStorage.getItem('token')}` }
      }
    );

    const data = await res.json();

    if (res.ok) {
      li.remove(); // إزالة العنصر من الصفحة
      Swal.fire('تم الحذف!', data.message || 'تم حذف التقرير بنجاح.', 'success');
    } else {
      throw new Error(data.message || 'فشل الحذف');
    }

  } catch (err) {
    console.error(err);
    Swal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
  }
}







