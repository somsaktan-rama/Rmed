const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzZwPFYNmYvFm4UbjzshG4TgIXW2MhfZT_0nBwcY9PzNjN3549ZBFUx5k42twY0Ggul/exec"; 
let currentUser = null;
let currentSearchResults = null; 

// =====================================
// 1. INIT & LOGIN LOGIC
// =====================================
window.onload = function() {
  checkLocalLogin();
};

function checkLocalLogin() {
  const savedRamaId = localStorage.getItem('savedRamaId');
  if (savedRamaId) {
    verifyRamaId(savedRamaId, false);
  } else {
    document.getElementById('loginSection').classList.remove('d-none');
    document.getElementById('appSection').classList.add('d-none');
  }
}

document.getElementById('btnLogin').addEventListener('click', () => {
  const ramaId = document.getElementById('inputRamaId').value.trim();
  if (!ramaId) return Swal.fire('แจ้งเตือน', 'กรุณากรอก RamaID', 'warning');
  verifyRamaId(ramaId, true);
});

document.getElementById('btnLogout').addEventListener('click', () => {
  Swal.fire({
    title: 'ต้องการออกจากระบบ?',
    text: "ระบบจะล้างข้อมูลการเข้าสู่ระบบเดิมของคุณออก",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'ออกจากระบบ',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem('savedRamaId');
      currentUser = null; 
      document.getElementById('appSection').classList.add('d-none');
      document.getElementById('loginSection').classList.remove('d-none');
      document.getElementById('inputRamaId').value = ''; 
      Swal.fire({ title: 'สำเร็จ', text: 'ออกจากระบบเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
    }
  });
});

function verifyRamaId(ramaId, showSuccessAlert) {
  if (showSuccessAlert) Swal.fire({ title: 'กำลังตรวจสอบ...', didOpen: () => { Swal.showLoading() }});

  // ใช้ fetch() แทน google.script.run
  fetch(`${SCRIPT_URL}?action=login&ramaId=${ramaId}`, { 
  method: 'GET',
  redirect: 'follow' // เพิ่มบรรทัดนี้เพื่อสั่งให้เบราว์เซอร์วิ่งตามการ Redirect ของ Google
  })
    .then(response => response.json())
    .then(res => {
      if (res.status === "success" && res.data.success) {
        currentUser = res.data.user;
        localStorage.setItem('savedRamaId', currentUser.RamaID || currentUser.ramaid);
        
        if (showSuccessAlert) {
          Swal.fire({ title: 'สำเร็จ', text: 'เข้าสู่ระบบเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          Swal.close(); 
        }
        showAppMain();
      } else {
        localStorage.removeItem('savedRamaId');
        Swal.fire('ข้อผิดพลาด', (res.data ? res.data.message : 'ไม่พบข้อมูล'), 'error');
        document.getElementById('loginSection').classList.remove('d-none');
        document.getElementById('appSection').classList.add('d-none');
      }
    })
    .catch(err => {
      localStorage.removeItem('savedRamaId');
      Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
      document.getElementById('loginSection').classList.remove('d-none');
      document.getElementById('appSection').classList.add('d-none');
    });
}

function showAppMain() {
  document.getElementById('loginSection').classList.add('d-none');
  document.getElementById('appSection').classList.remove('d-none');
  
  let navName = currentUser.Name || currentUser.name || "ไม่ระบุชื่อ";
  let navRole = currentUser.RoleYear || currentUser.roleyear || "";
  document.getElementById('displayUserName').innerText = `${navName} (${navRole})`;
  
  // --- ระบบจัดการสิทธิ์ (Permission Control) ---
  let userRoleUpper = navRole.toUpperCase().trim();
  let allowedRoles = ["R1", "R2", "R3"];
  
  if (!allowedRoles.includes(userRoleUpper)) {
    // ซ่อนแท็บที่ไม่เกี่ยวข้องสำหรับ Staff/Fellow/อื่นๆ
    document.getElementById('tab-dashboard').parentElement.classList.add('d-none');
    document.getElementById('tab-search').parentElement.classList.add('d-none');
    document.getElementById('tab-consult').parentElement.classList.add('d-none');
    document.getElementById('tab-swap').parentElement.classList.add('d-none');
    
    // บังคับให้แสดงหน้า Overview
    document.getElementById('tab-overview').click();
  } else {
    // แสดงครบทุกแท็บสำหรับ R1, R2, R3
    document.getElementById('tab-dashboard').parentElement.classList.remove('d-none');
    document.getElementById('tab-search').parentElement.classList.remove('d-none');
    document.getElementById('tab-consult').parentElement.classList.remove('d-none');
    document.getElementById('tab-swap').parentElement.classList.remove('d-none');
  }

  // เรียกใช้ปฏิทิน
  initDatePicker();
  
  // โหลดข้อมูล Dashboard (จะโหลดเงียบๆ หลังบ้าน)
  loadDashboard();

  // กดปุ่มดึงข้อมูลหน้าสรุปประจำวันให้อัตโนมัติ
  const btnOverview = document.getElementById('btnSearchOverview');
  if(btnOverview) {
      btnOverview.click();
  }
}

// =====================================
// 2. DATE PICKER (Flatpickr)
// =====================================
function initDatePicker() {
  const flatpickrConfig = {
    locale: "th",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    disableMobile: true,
    formatDate: (date, formatStr) => {
      if (formatStr === "d/m/Y") {
        let d = date.getDate().toString().padStart(2, '0');
        let m = (date.getMonth() + 1).toString().padStart(2, '0');
        let y = date.getFullYear() + 543;
        return `${d}/${m}/${y}`;
      }
      return flatpickr.formatDate(date, formatStr); 
    }
  };

  flatpickr("#overviewDateInput", { ...flatpickrConfig, defaultDate: "today" });
  flatpickr("#searchDateInput", { ...flatpickrConfig, defaultDate: "today" });
  flatpickr("#consultDateInput", { ...flatpickrConfig, defaultDate: "today" });
  flatpickr("#swapDateReq", { ...flatpickrConfig });
  flatpickr("#swapDateTarget", { ...flatpickrConfig });
}

// =====================================
// 3. DASHBOARD LOGIC
// =====================================
function loadDashboard() {
  document.getElementById('currRotationContent').innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"></div> กำลังดึงข้อมูล...';
  document.getElementById('extraShiftsContent').innerHTML = '<div class="spinner-border spinner-border-sm text-danger" role="status"></div> กำลังดึงข้อมูล...';

  let rId = currentUser.RamaID || currentUser.ramaid;

  // ใช้ fetch() แทน google.script.run
  fetch(`${SCRIPT_URL}?action=dashboard&ramaId=${rId}`, {
  method: 'GET',
  redirect: 'follow'
  })
    .then(response => response.json())
    .then(res => {
      if(res.status !== "success") throw new Error(res.message || "ดึงข้อมูลล้มเหลว");
      const data = res.data;

      // วาดข้อมูล In-time Rotation
      if (data.currentRotationInfo) {
        document.getElementById('currRotationContent').innerHTML = `
          <div class="d-flex align-items-center">
            <div class="fs-1 me-3">🏥</div>
            <div>
              <h4 class="mb-0 text-primary fw-bold">${data.currentRotationInfo.ward}</h4>
              <small class="text-muted">Rotation: ${data.currentRotationInfo.rotationNo} | <span class="text-info">ค้นหาด้วย: "${data.currentRotationInfo.debugName}"</span></small>
            </div>
          </div>
        `;
      }

      // วาดข้อมูลเวร
      if (!data.extraShifts || data.extraShifts.length === 0) {
        document.getElementById('extraShiftsContent').innerHTML = `<div class="alert alert-light border text-center text-success mb-0">ไม่มีเวรนอกเวลาในระบบ <br><small class="text-muted">(ตรวจสอบชีต extra ว่ามีคำว่า "${data.currentRotationInfo.debugName}" หรือไม่)</small></div>`;
      } else {
        let shiftHtml = '<div class="list-group">';
        data.extraShifts.forEach(shift => {
          let d = shift.day.toString().padStart(2, '0');
          let m = shift.month.toString().padStart(2, '0');
          let y = shift.year + 543; 
          let displayDate = `${d}/${m}/${y}`;
          let bgClass = "";
          let badgeHtml = "";
          
          if (shift.dateType === 'holiday') {
              bgClass = "bg-danger bg-opacity-10 border-danger border-2"; 
              badgeHtml = `<span class="badge bg-danger mb-1"><i class="bi bi-calendar-event me-1"></i>${shift.desc}</span><br>`;
          } else if (shift.dateType === 'weekend') {
              bgClass = "bg-warning bg-opacity-10 border-warning border-2"; 
              badgeHtml = `<span class="badge bg-warning text-dark mb-1">${shift.desc}</span><br>`;
          }

          shiftHtml += `
            <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${bgClass}">
              <div>
                ${badgeHtml}
                <strong class="text-dark fs-5">${displayDate}</strong><br>
                <small class="text-danger fw-bold">แผนก: ${shift.wards}</small>
              </div>
              <span class="badge bg-danger rounded-pill shadow-sm">นอกเวลา</span>
            </div>
          `;
        });
        shiftHtml += '</div>';
        document.getElementById('extraShiftsContent').innerHTML = shiftHtml;
      }
    })
    .catch(err => {
      document.getElementById('currRotationContent').innerHTML = '<span class="text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</span>';
      document.getElementById('extraShiftsContent').innerHTML = `<span class="text-danger">${err.message}</span>`;
    });
}

// =====================================
// 4. SEARCH LOGIC
// =====================================
document.getElementById('btnSearchSchedule').addEventListener('click', () => {
  const searchDate = document.getElementById('searchDateInput').value;
  if (!searchDate) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกวันที่ต้องการค้นหา', 'warning');

  Swal.fire({ title: 'กำลังค้นหาข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});

  fetch(`${SCRIPT_URL}?action=search&date=${searchDate}`, {
  method: 'GET',
  redirect: 'follow'
  })
    .then(response => response.json())
    .then(res => {
      if(res.status !== "success") throw new Error(res.message);
      
      Swal.close();
      const data = res.data;
      currentSearchResults = data; 
      
      document.getElementById('searchResultsContainer').classList.remove('d-none');
      document.getElementById('filterWardContainer').classList.remove('d-none');
      document.getElementById('searchRotBadge').innerText = data.targetRotation || "ไม่พบช่วง Rotation";

      populateWardFilter(data.inTime, data.extraTime);
      renderSearchResults('', data.inTime, data.extraTime); 
    })
    .catch(err => Swal.fire('ข้อผิดพลาด', err.message, 'error'));
});

function populateWardFilter(inTimeData, extraData) {
  const select = document.getElementById('filterWardSelect');
  let wards = new Set(); 
  inTimeData.forEach(item => wards.add(item.ward));
  extraData.forEach(item => wards.add(item.ward));

  let options = '<option value="">-- แสดงทุกแผนก / สถานที่ --</option>';
  Array.from(wards).sort().forEach(w => { options += `<option value="${w}">${w}</option>`; });
  select.innerHTML = options;
}

document.getElementById('filterWardSelect').addEventListener('change', (e) => {
  const selectedWard = e.target.value;
  if (currentSearchResults) {
    renderSearchResults(selectedWard, currentSearchResults.inTime, currentSearchResults.extraTime);
  }
});

function renderSearchResults(filterWard, inTimeData, extraData) {
  const inTimeUl = document.getElementById('searchInTimeResult');
  const extraUl = document.getElementById('searchExtraTimeResult');

  let filteredInTime = filterWard ? inTimeData.filter(item => item.ward === filterWard) : inTimeData;
  let filteredExtra = filterWard ? extraData.filter(item => item.ward === filterWard) : extraData;

  // วาดในเวลา
  if (filteredInTime.length === 0) {
    inTimeUl.innerHTML = '<li class="list-group-item text-muted text-center py-3">ไม่พบรายชื่อ</li>';
  } else {
    let html = '';
    const groupedInTime = groupBy(filteredInTime, 'ward');
    for (const [wardName, people] of Object.entries(groupedInTime)) {
      html += `<li class="list-group-item bg-light text-primary fw-bold">${wardName}</li>`;
      people.forEach(p => { 
        let details = [];
        if (p.role) details.push(p.role);
        if (p.code) details.push(p.code);
        let detailBadge = details.length > 0 ? `<span class="badge bg-secondary ms-1">(${details.join(', ')})</span>` : '';
        html += `<li class="list-group-item"><i class="bi bi-person-fill text-secondary me-2"></i>${p.name} ${detailBadge}</li>`; 
      });
    }
    inTimeUl.innerHTML = html;
  }

  // วาดนอกเวลา
  if (filteredExtra.length === 0) {
    extraUl.innerHTML = '<li class="list-group-item text-muted text-center py-3">ไม่พบรายชื่อ</li>';
  } else {
    let html = '';
    const groupedExtra = groupBy(filteredExtra, 'ward');
    for (const [wardName, people] of Object.entries(groupedExtra)) {
      html += `<li class="list-group-item bg-light text-danger fw-bold">${wardName}</li>`;
      people.forEach(p => { 
        let details = [];
        if (p.role) details.push(p.role);
        if (p.code) details.push(p.code);
        let detailBadge = details.length > 0 ? `<span class="badge bg-danger ms-1">(${details.join(', ')})</span>` : '';
        html += `<li class="list-group-item"><i class="bi bi-moon-stars-fill text-warning me-2"></i>${p.name} ${detailBadge}</li>`; 
      });
    }
    extraUl.innerHTML = html;
  }
}

// Helper Function 
function groupBy(array, key) {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
    return result;
  }, {});
}

// =====================================
// 5. CONSULT FELLOW LOGIC
// =====================================
document.getElementById('btnSearchConsult').addEventListener('click', () => {
  const searchDate = document.getElementById('consultDateInput').value;
  if (!searchDate) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกวันที่ต้องการค้นหา', 'warning');

  Swal.fire({ title: 'กำลังค้นหาข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});

  fetch(`${SCRIPT_URL}?action=consult&date=${searchDate}`, {
    method: 'GET',
    redirect: 'follow'
  })
    .then(response => response.json())
    .then(res => {
      if(res.status !== "success") throw new Error(res.message);
      
      Swal.close();
      const consultData = res.data;
      const resultContainer = document.getElementById('consultResultContainer');
      const listEl = document.getElementById('consultListResult');
      
      resultContainer.classList.remove('d-none');
      listEl.innerHTML = ''; // เคลียร์ของเก่า

      if (consultData.length === 0) {
        listEl.innerHTML = '<div class="alert alert-light border text-center text-muted">ไม่พบข้อมูล Fellow รับปรึกษาในวันนี้</div>';
      } else {
        // จัดกลุ่มตามชื่อ Division (เผื่อมีการส่งข้อมูลสลับไปมา)
        consultData.forEach(fellow => {
          let btnHtml = "";
          // เช็คว่ามีเบอร์โทรหรือไม่
          if (fellow.mobile && fellow.mobile !== "ไม่พบเบอร์") {
            // ใช้คำสั่ง href="tel:..." เพื่อให้มือถือกดแล้วโทรออกได้เลย
            // ลบขีดกลางหรือช่องว่างออกจากเบอร์ก่อนใส่ในลิงก์ tel:
            let cleanPhone = fellow.mobile.toString().replace(/[^0-9]/g, ''); 
            btnHtml = `<a href="tel:${cleanPhone}" class="btn btn-success btn-sm rounded-pill shadow-sm px-3">
                         <i class="bi bi-telephone-outbound me-1"></i> ${fellow.mobile}
                       </a>`;
          } else {
            btnHtml = `<span class="badge bg-secondary text-light">ไม่พบเบอร์</span>`;
          }

          listEl.innerHTML += `
            <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
              <div>
                <strong class="text-primary fs-6">${fellow.division}</strong><br>
                <span class="text-dark"><i class="bi bi-person-badge text-secondary me-1"></i>${fellow.name}</span>
              </div>
              <div>
                ${btnHtml}
              </div>
            </div>
          `;
        });
      }
    })
    .catch(err => Swal.fire('ข้อผิดพลาด', err.message, 'error'));
});


// =====================================
// 6. OVERVIEW DASHBOARD LOGIC
// =====================================
let currentOverviewData = null; // เก็บข้อมูลชั่วคราวเพื่อทำ Filter

document.getElementById('btnSearchOverview').addEventListener('click', () => {
  const searchDate = document.getElementById('overviewDateInput').value;
  if (!searchDate) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกวันที่', 'warning');

  Swal.fire({ title: 'กำลังโหลดสรุปประจำวัน...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});

  fetch(`${SCRIPT_URL}?action=daily_summary&date=${searchDate}`, {
    method: 'GET',
    redirect: 'follow'
  })
    .then(response => response.json())
    .then(res => {
      if(res.status !== "success") throw new Error(res.message);
      
      Swal.close();
      currentOverviewData = res.data; // บันทึกข้อมูล
      
      document.getElementById('overviewResultContainer').classList.remove('d-none');
      document.getElementById('overviewFilterContainer').classList.remove('d-none');

      // สร้างตัวเลือกใน Dropdown Filter
      populateOverviewFilter(currentOverviewData);

      // วาดผลลัพธ์ทั้งหมดเป็นค่าเริ่มต้น (ไม่ใส่ Filter)
      renderOverviewAll(currentOverviewData, ""); 
    })
    .catch(err => Swal.fire('ข้อผิดพลาด', err.message, 'error'));
});

// เมื่อผู้ใช้เลือก Dropdown
document.getElementById('overviewWardFilter').addEventListener('change', (e) => {
  const selectedWard = e.target.value;
  if (currentOverviewData) {
    renderOverviewAll(currentOverviewData, selectedWard);
  }
});

// ฟังก์ชันสร้างตัวเลือก Filter จากแผนกทั้งหมดที่มีในวันนั้น
function populateOverviewFilter(data) {
  const select = document.getElementById('overviewWardFilter');
  let wards = new Set();
  
  if (data.consults) data.consults.forEach(item => wards.add(item.division));
  if (data.extraTime) data.extraTime.forEach(item => wards.add(item.ward));
  if (data.inTime) data.inTime.forEach(item => wards.add(item.ward));

  let options = '<option value="">-- แสดงทุกแผนก --</option>';
  Array.from(wards).sort().forEach(w => {
    options += `<option value="${w}">${w}</option>`;
  });
  select.innerHTML = options;
}

// ฟังก์ชันหลักสำหรับสั่งวาดข้อมูลทั้ง 3 ส่วน
function renderOverviewAll(data, filterWard) {
  // กรองข้อมูลตามที่เลือก (ถ้าไม่ได้เลือก ให้คืนค่าทั้งหมด)
  const filteredConsults = filterWard ? data.consults.filter(c => c.division === filterWard) : data.consults;
  const filteredExtra = filterWard ? data.extraTime.filter(e => e.ward === filterWard) : data.extraTime;
  const filteredInTime = filterWard ? data.inTime.filter(i => i.ward === filterWard) : data.inTime;

  renderOverviewConsults(filteredConsults);
  renderOverviewExtra(filteredExtra);
  renderOverviewInTime(filteredInTime);
}

// 6.1 วาดข้อมูล Fellow รับปรึกษา
function renderOverviewConsults(consults) {
  const container = document.getElementById('overviewConsultResult');
  if (!consults || consults.length === 0) {
    container.innerHTML = '<li class="list-group-item text-muted text-center py-3">ไม่มีข้อมูล Fellow รับปรึกษา</li>';
    return;
  }
  let html = '';
  consults.forEach(c => {
    let cleanPhone = c.mobile.replace(/[^0-9]/g, '');
    let phoneBtn = (cleanPhone && cleanPhone !== "ไม่พบเบอร์") 
      ? `<a href="tel:${cleanPhone}" class="btn btn-outline-success btn-sm rounded-pill"><i class="bi bi-telephone"></i> ${c.mobile}</a>`
      : `<span class="badge bg-secondary">ไม่มีเบอร์</span>`;

    html += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong class="text-success">${c.division}</strong><br>
          <span class="text-dark small"><i class="bi bi-person-badge text-secondary me-1"></i>${c.name}</span>
        </div>
        <div>${phoneBtn}</div>
      </li>`;
  });
  container.innerHTML = html;
}

// 6.2 วาดข้อมูลเวรนอกเวลา
function renderOverviewExtra(extraData) {
  const container = document.getElementById('overviewExtraResult');
  if (!extraData || extraData.length === 0) {
    container.innerHTML = '<li class="list-group-item text-muted text-center py-3">ไม่มีผู้ขึ้นเวรนอกเวลา</li>';
    return;
  }
  
  const groupedExtra = groupBy(extraData, 'ward');
  let html = '';
  for (const [ward, people] of Object.entries(groupedExtra)) {
    html += `<li class="list-group-item bg-light text-danger fw-bold border-bottom">${ward}</li>`;
    people.forEach(p => {
      // ประกอบข้อความ (RoleYear, Code)
      let details = [];
      if (p.role) details.push(p.role);
      if (p.code) details.push(p.code); // ดึงรหัส Code
      let detailBadge = details.length > 0 ? `<span class="badge bg-danger ms-1">(${details.join(', ')})</span>` : '';
      
      html += `<li class="list-group-item ps-4">
                 <i class="bi bi-moon-stars-fill text-warning me-2"></i>${p.name} ${detailBadge}
               </li>`;
    });
  }
  container.innerHTML = html;
}

// 6.3 วาดข้อมูลปฏิบัติงานในเวลา
function renderOverviewInTime(inTimeData) {
  const container = document.getElementById('overviewInTimeResult');
  if (!inTimeData || inTimeData.length === 0) {
    container.innerHTML = '<li class="list-group-item text-muted text-center py-3">ไม่มีข้อมูลปฏิบัติงาน</li>';
    return;
  }

  const groupedInTime = groupBy(inTimeData, 'ward');
  let html = '';
  
  const sortedWards = Object.keys(groupedInTime).sort();
  
  sortedWards.forEach(ward => {
    html += `<li class="list-group-item bg-light text-primary fw-bold border-bottom">${ward}</li>`;
    
    const sortedPeople = groupedInTime[ward].sort((a, b) => (a.role || "").localeCompare(b.role || ""));
    
    sortedPeople.forEach(p => {
      // ประกอบข้อความ (RoleYear, Code)
      let details = [];
      if (p.role) details.push(p.role);
      if (p.code) details.push(p.code); // ดึงรหัส Code
      let detailBadge = details.length > 0 ? `<span class="badge bg-secondary ms-1">(${details.join(', ')})</span>` : '';
      
      html += `<li class="list-group-item ps-4">
                 <i class="bi bi-person-fill text-secondary me-2"></i>${p.name} ${detailBadge}
               </li>`;
    });
  });
  
  container.innerHTML = html;
}

// =====================================
// HELPER FUNCTION 
// =====================================
function groupBy(array, key) {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
    return result;
  }, {});
}
