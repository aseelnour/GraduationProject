const API = "http://localhost:5000/api/topDonors";

// ===================== تحميل البيانات عند فتح الصفحة =====================
document.addEventListener("DOMContentLoaded", () => {
    loadTopDonors();
    loadStats();
});
function loadTopDonors() {

  fetch(API + "/")
    .then(res => res.json())
    .then(data => {
      const container = document.querySelector(".top-donors-list");
      if (!container) return;

      container.innerHTML = "";

      if (!data.topDonors || data.topDonors.length === 0) {
        container.innerHTML = "<p>لا يوجد متبرعون لهذا الشهر</p>";
        return;
      }

      data.topDonors.forEach(d => {
        container.innerHTML += `
          <div class="donor-card">
            <div class="donor-box">
              <img src="${d.profileImage}" alt="donor">
              
              <div class="donor-details">
                <h3>${d.name}</h3>
                <p class="desc">محسن كريم يساهم في دعم المشاريع الخيرية</p>

                <div class="stats">
                  <span>
                    <span class="icon">📑</span>
                    عدد التبرعات: ${d.donationsCount}
                  </span>

                  <span>
                    <span class="icon">💰</span>
                    إجمالي التبرعات: ${d.totalDonations.toLocaleString()} ₪
                  </span>
                </div>
              </div>
          

            <div class="donor-badge">
              <span><i class="fa-regular fa-heart"></i></span>
            </div>
</div>
            <div class="donor-footer">
              شكراً لك على دعمك المستمر
              <i class="fa-solid fa-heart text-primary"></i>
            </div>
          </div>
        `;
      });
    })
    .catch(err => console.error("Error loading top donors:", err));
}


async function loadStats() {
    try {
        //  عدد المتبرعين
        fetch(`${API}/donors-count`)
            .then(res => res.json())
            .then(data => {
                document.querySelector(".stat-donors").textContent = data.total + "+";
            });

        //  إجمالي التبرعات
        fetch(`${API}/total-donations`)
            .then(res => res.json())
            .then(data => {
                document.querySelector(".stat-total-donations").textContent = data.total + " ₪";
            });

        //  عدد المشاريع المدعومة
        fetch(`${API}/supported-projects`)
            .then(res => res.json())
            .then(data => {
                document.querySelector(".stat-projects").textContent = data.total + "+";
            });

        //  معدل نجاح المشاريع
        fetch(`${API}/projects-success-rate`)
            .then(res => res.json())
            .then(data => {
                document.querySelector(".stat-success-rate").textContent = data.successRate + "%";
            });

    } catch (err) {
        console.error("Error loading stats:", err);
    }
}
