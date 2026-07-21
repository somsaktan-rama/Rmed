const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzig08MtJp8WPVdWMw_ljukwRHSnh5LTRkawTN2jCbDWfPkcOK8vdR9FeVD9nu4RnLs/exec"; 
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
  let navPct = currentUser.PCT || currentUser.pct || ""; 
  
  // สร้างปุ่มเบอร์ตัวเอง (ถ้ามี)
  let pctHtml = (navPct && navPct.toString().trim() !== "") 
      ? `<a href="tel:022011000,${navPct.toString().trim()}" class="badge bg-success text-decoration-none ms-2"><i class="bi bi-telephone-outbound"></i> ${navPct}</a>` 
      : "";
      
  document.getElementById('displayUserName').innerHTML = `${navName} (${navRole}) ${pctHtml}`;
  
  // ===============================================
  // --- ระบบจัดการสิทธิ์ (Permission Control) ---
  // ===============================================
  let userRoleUpper = navRole.toUpperCase().trim();
  let isResidentOrFellow = userRoleUpper.startsWith('R') || userRoleUpper.startsWith('F');
  
  if (isResidentOrFellow) {
    // 🌟 กลุ่ม R และ F: ปิดหน้า Overview, โชว์แท็บทำงานทั้งหมด
    if (document.getElementById('tab-overview')) {
        document.getElementById('tab-overview').parentElement.classList.add('d-none');
    }
    document.getElementById('tab-dashboard').parentElement.classList.remove('d-none');
    document.getElementById('tab-search').parentElement.classList.remove('d-none');
    document.getElementById('tab-consult').parentElement.classList.remove('d-none');
    document.getElementById('tab-swap').parentElement.classList.remove('d-none');
    
    // บังคับไปที่หน้า Dashboard เป็นหน้าแรกของ R และ F
    document.getElementById('tab-dashboard').click();
    
    // โหลดข้อมูล Dashboard
    initDatePicker();
    loadDashboard();
    
  } else {
    // 🌟 กลุ่มอื่นๆ (Staff): โชว์หน้า Overview
    if (document.getElementById('tab-overview')) {
        document.getElementById('tab-overview').parentElement.classList.remove('d-none');
    }
    document.getElementById('tab-dashboard').parentElement.classList.add('d-none');
    document.getElementById('tab-swap').parentElement.classList.add('d-none');
    
    // หน้า Search และ Consult สามารถเปิดทิ้งไว้ให้ Staff ดูได้
    document.getElementById('tab-search').parentElement.classList.remove('d-none');
    document.getElementById('tab-consult').parentElement.classList.remove('d-none');
    
    // บังคับไปที่หน้า Overview เป็นหน้าแรกของ Staff
    document.getElementById('tab-overview').click();
    
    // 🌟 ตั้งค่า Default ให้ช่องค้นหาเป็น "วันที่ของวันนี้"
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = localDate.toISOString().split('T')[0]; // จะได้ YYYY-MM-DD
    
    const overviewDateInput = document.getElementById('overviewDateInput');
    if (overviewDateInput) {
        overviewDateInput.value = todayStr;
    }
    
    // สั่งให้กดปุ่มค้นหาวันนี้ในหน้า Overview อัตโนมัติ
    const btnOverview = document.getElementById('btnSearchOverview');
    if(btnOverview) btnOverview.click();
  }
} // <--- 🌟 ตรงนี้คือปีกกาปิดที่หายไปครับ 🌟

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
// 4. SEARCH LOGIC (ค้นหาตารางเวรตามวันที่ - อัปเดตตัดคำ/เรียงอักษร)
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
      
      // 🌟 1. เพิ่มโค้ดตัดคำว่า R1-, R2-, R3- และจัดเรียงตัวอักษรของเวรนอกเวลา
      if (data.extraTime && data.extraTime.length > 0) {
          data.extraTime = data.extraTime.map(item => {
              if (item.ward) {
                  item.ward = item.ward.replace(/^(R1|R2|R3)-/i, '').trim();
              }
              return item;
          });
          
          data.extraTime.sort((a, b) => a.ward.localeCompare(b.ward, 'th', { numeric: true }));
      }

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
  
  if (inTimeData) inTimeData.forEach(item => wards.add(item.ward));
  if (extraData) extraData.forEach(item => wards.add(item.ward));

  let options = '<option value="">-- แสดงทุกแผนก / สถานที่ --</option>';
  
  // 🌟 2. อัปเดตการจัดเรียงใน Dropdown ให้เรียงตัวเลขถูกต้อง (7 -> 8 -> 9)
  Array.from(wards).sort((a, b) => a.localeCompare(b, 'th', { numeric: true })).forEach(w => { 
      options += `<option value="${w}">${w}</option>`; 
  });
  
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
        
        let pctBtn = '';
        if (p.pct && p.pct.toString().trim() !== '') {
          pctBtn = `<a href="tel:022011000,${p.pct.toString().trim()}" class="btn btn-sm btn-outline-success ms-2 rounded-pill py-0 px-2" style="font-size: 0.8rem;"><i class="bi bi-telephone-outbound-fill"></i> ${p.pct.toString().trim()}</a>`;
        }

        html += `<li class="list-group-item d-flex align-items-center flex-wrap"><i class="bi bi-person-fill text-secondary me-2"></i>${p.name} ${detailBadge} ${pctBtn}</li>`; 
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
        
        let pctBtn = '';
        if (p.pct && p.pct.toString().trim() !== '') {
          pctBtn = `<a href="tel:022011000,${p.pct.toString().trim()}" class="btn btn-sm btn-outline-success ms-2 rounded-pill py-0 px-2" style="font-size: 0.8rem;"><i class="bi bi-telephone-outbound-fill"></i> ${p.pct.toString().trim()}</a>`;
        }

        html += `<li class="list-group-item d-flex align-items-center flex-wrap"><i class="bi bi-moon-stars-fill text-warning me-2"></i>${p.name} ${detailBadge} ${pctBtn}</li>`; 
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
// 6. OVERVIEW DASHBOARD LOGIC (อัปเดตตัดคำนำหน้า R1, R2, R3 และเรียงลำดับตัวอักษร)
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
      
      // 🌟 ประมวลผลข้อมูลเวรนอกเวลา
      if (res.data && res.data.extraTime) {
          
          // 1. ตัดคำว่า R1-, R2-, R3- ทิ้ง
          res.data.extraTime = res.data.extraTime.map(item => {
              item.ward = item.ward.replace(/^(R1|R2|R3)-/i, '').trim();
              return item;
          });
          
          // 🔥 2. เรียงลำดับชื่อสถานที่ (A-Z, ก-ฮ และเรียงตามตัวเลข)
          res.data.extraTime.sort((a, b) => {
              // ใช้ localeCompare พร้อม {numeric: true} เพื่อให้เลข 7 มาก่อน 8, 9
              return a.ward.localeCompare(b.ward, 'th', { numeric: true });
          });
      }
      
      Swal.close(); // ปิด popup โหลด
      currentOverviewData = res.data; // บันทึกข้อมูล
      
      document.getElementById('overviewResultContainer').classList.remove('d-none');
      document.getElementById('overviewFilterContainer').classList.remove('d-none');

      // สร้างตัวเลือกใน Dropdown Filter
      populateOverviewFilter(currentOverviewData);

      // วาดผลลัพธ์ทั้งหมดเป็นค่าเริ่มต้น (ไม่ใส่ Filter)
      renderOverviewAll(currentOverviewData, ""); 
      
      // ให้เด้งเตือนแลกเวรเฉพาะตอนล็อกอินครั้งแรก
      if (window.isFirstLoad === undefined) {
          checkPendingSwapsAlert();
          window.isFirstLoad = false;
      }
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
      let details = [];
      if (p.role) details.push(p.role);
      if (p.code) details.push(p.code);
      let detailBadge = details.length > 0 ? `<span class="badge bg-danger ms-1">(${details.join(', ')})</span>` : '';
      
      let pctBtn = '';
      if (p.pct && p.pct.toString().trim() !== '') {
        pctBtn = `<a href="tel:022011000,${p.pct.toString().trim()}" class="btn btn-sm btn-outline-success ms-2 rounded-pill py-0 px-2" style="font-size: 0.8rem;"><i class="bi bi-telephone-outbound-fill"></i> ${p.pct.toString().trim()}</a>`;
      }
      
      html += `<li class="list-group-item ps-4 d-flex align-items-center flex-wrap">
                 <i class="bi bi-moon-stars-fill text-warning me-2"></i>${p.name} ${detailBadge} ${pctBtn}
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
    
    // บังคับแปลงเป็น string ก่อนเรียงลำดับ ป้องกัน Error
    const sortedPeople = groupedInTime[ward].sort((a, b) => {
        let roleA = (a.role || "").toString();
        let roleB = (b.role || "").toString();
        return roleA.localeCompare(roleB);
    });
    
    sortedPeople.forEach(p => {
      let details = [];
      if (p.role) details.push(p.role);
      if (p.code) details.push(p.code);
      let detailBadge = details.length > 0 ? `<span class="badge bg-secondary ms-1">(${details.join(', ')})</span>` : '';
      
      let pctBtn = '';
      if (p.pct && p.pct.toString().trim() !== '') {
        pctBtn = `<a href="tel:022011000,${p.pct.toString().trim()}" class="btn btn-sm btn-outline-success ms-2 rounded-pill py-0 px-2" style="font-size: 0.8rem;"><i class="bi bi-telephone-outbound-fill"></i> ${p.pct.toString().trim()}</a>`;
      }
      
      html += `<li class="list-group-item ps-4 d-flex align-items-center flex-wrap">
                 <i class="bi bi-person-fill text-secondary me-2"></i>${p.name} ${detailBadge} ${pctBtn}
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

function checkPendingSwapsAlert() {
  let currentUid = currentUser.RamaID || currentUser.ramaid || currentUser.id;
  if (!currentUid) return;
  
  fetch(`${SCRIPT_URL}?action=check_pending_swaps&uid=${currentUid}`)
    .then(res => res.json())
    .then(res => {
      if (res.status === "success" && res.data && res.data.length > 0) {
        let reqCount = res.data.length;
        let latestReq = res.data[res.data.length - 1]; 
        
        Swal.fire({
          title: 'แจ้งเตือนแลกเวร!',
          html: `คุณมีคำขอแลกเวรที่รอการอนุมัติ <b>${reqCount} รายการ</b><br><span class="text-muted small">จาก: ${latestReq.requesterName}</span>`,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: '<i class="bi bi-eye-fill"></i> ดูคำขอ',
          cancelButtonText: 'ไว้ทีหลัง',
          confirmButtonColor: '#0dcaf0' 
        }).then((result) => {
          if (result.isConfirmed) {
            let swapTab = document.getElementById('tab-swap');
            if(swapTab) swapTab.click();
          }
        });
      }
    })
    .catch(err => console.log("Error:", err));
}

// ==========================================
// ระบบ INBOX จัดการคำขอแลกเวร
// ==========================================

// ฟังก์ชันแปลงวันที่ให้เป็นภาษาไทยแบบสวยงาม (มีวันจันทร์-อาทิตย์ และ พ.ศ.)
function formatThaiFullDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  
  const weekdays = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear() + 543;
  const w = weekdays[date.getDay()];
  
  return `${w}ที่ ${d} ${m} ${y}`;
}

document.getElementById('tab-swap').addEventListener('click', () => {
  loadPendingSwapsList(); // ของเดิม (Inbox ขาเข้า)
  loadOutgoingSwapsList(); // 🌟 สิ่งที่ต้องพิมพ์เพิ่ม (Inbox ขาออก)
});

// ==========================================
// ระบบดึงคำขอที่เพื่อนส่งมาหาเรา (Inbox ขาเข้า) - อัปเดตปุ่มเป็นข้อความชัดเจน
// ==========================================
function loadPendingSwapsList() {
  let currentUid = currentUser.RamaID || currentUser.ramaid || currentUser.id;
  if (!currentUid) return;
  
  const container = document.getElementById('pendingSwapsContainer');
  const list = document.getElementById('pendingSwapsList');
  
  fetch(`${SCRIPT_URL}?action=check_pending_swaps&uid=${currentUid}`)
    .then(res => res.json())
    .then(res => {
      if (res.status === "success" && res.data && res.data.length > 0) {
        container.style.display = 'block'; 
        let html = '';
        
        res.data.forEach(req => {
          // ใช้ฟังก์ชันแปลงวันที่ภาษาไทย
          let fmtReqDate = req.reqDate ? formatThaiFullDate(req.reqDate) : '';
          let fmtTargetDate = req.targetDate ? formatThaiFullDate(req.targetDate) : '';
          
          let targetDateHtml = req.targetDate ? `<br><small class="text-secondary">📅 วันที่คุณจะไปคืนเวร: <span class="fw-bold">${fmtTargetDate || req.targetDate}</span></small>` : '';
          let wardHtml = req.ward && req.ward !== "ไม่ระบุสถานที่" ? `<br><small class="text-secondary">🏥 สถานที่: <span class="badge bg-danger">${req.ward}</span></small>` : '';

          html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong class="text-primary"><i class="bi bi-person-fill me-1"></i>${req.requesterName}</strong> ขอแลกเวร
                ${wardHtml}
                <br><small class="text-muted">🔴 วันที่คุณต้องไปแทน: <span class="text-danger fw-bold">${fmtReqDate || req.reqDate}</span></small>
                ${targetDateHtml}
              </div>
              
              <!-- 🌟 เปลี่ยนปุ่มจาก ไอคอน เป็น ข้อความ ตรงนี้ครับ 🌟 -->
              <div class="ms-2 d-flex gap-2">
                <button class="btn btn-sm btn-success rounded-pill px-3 shadow-sm fw-bold" onclick="respondSwap('${req.reqId}', 'Approved')">
                  อนุมัติ
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill px-3 shadow-sm fw-bold" onclick="respondSwap('${req.reqId}', 'Rejected')">
                  ปฏิเสธ
                </button>
              </div>
              <!-- 🌟 สิ้นสุดส่วนปุ่ม 🌟 -->
              
            </li>`;
        });
        list.innerHTML = html;
      } else {
        container.style.display = 'none'; 
      }
    })
    .catch(err => console.log(err));
}

// ฟังก์ชันเมื่อกดปุ่ม Approve หรือ Reject (อัปเดตกัน Cache)
window.respondSwap = function(reqId, status) {
  let statusText = status === "Approved" ? "อนุมัติ" : "ปฏิเสธ";
  let confirmColor = status === "Approved" ? "#198754" : "#dc3545"; 
  
  Swal.fire({
    title: `ยืนยันการ${statusText}?`,
    text: "เมื่อดำเนินการแล้ว ระบบจะบันทึกผลทันที",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: `ใช่, ${statusText}`,
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: confirmColor
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'กำลังดำเนินการ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});
      
      // 🔥 เพิ่มตัวแปรเวลา ป้องกันเบราว์เซอร์แอบจำค่าเก่า (Cache)
      const timeBuster = new Date().getTime();
      
      fetch(`${SCRIPT_URL}?action=update_swap_status&req_id=${reqId}&status=${status}&t=${timeBuster}`, { 
          method: 'GET',
          redirect: 'follow'
      })
        .then(res => res.json())
        .then(res => {
           // จะต้องเห็นข้อความว่าสลับชื่อ "(X ช่อง)" จากโค้ดใหม่
           if(res.status === "success") {
             Swal.fire('สำเร็จ!', res.message, 'success');
             loadPendingSwapsList(); 
           } else {
             Swal.fire('ข้อผิดพลาด', res.message, 'error');
           }
        })
        .catch(err => Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'));
    }
  });
}


// ==========================================
// 8. DYNAMIC SWAP FORM (Step-by-Step Dropdowns)
// ==========================================

// เมื่อกดแท็บ "แลกเวร" ให้โหลดเวรตัวเองลงช่องที่ 1
document.getElementById('tab-swap').addEventListener('click', () => {
  loadPendingSwapsList(); // โหลด Inbox
  
  let currentUid = currentUser.RamaID || currentUser.ramaid || currentUser.id;
  const selectReq = document.getElementById('swapDateReq');
  selectReq.innerHTML = '<option value="">กำลังโหลดเวรของคุณ...</option>';
  
  // 🌟 เพิ่ม { method: 'GET', redirect: 'follow' } เพื่อให้ทะลุ Google Redirect ได้
  fetch(`${SCRIPT_URL}?action=get_swap_shifts&uid=${currentUid}`, {
    method: 'GET',
    redirect: 'follow'
  })
    .then(res => res.json())
    .then(res => {
        selectReq.innerHTML = '<option value="">-- เลือกเวรของคุณ --</option>';
        if (res.data && res.data.length > 0) {
            res.data.forEach(shift => {
                let parts = shift.display.split(' ')[0].split('/');
                let thYear = parseInt(parts[2]) + 543;
                let thDisplay = `${parts[0]}/${parts[1]}/${thYear} ${shift.display.substring(shift.display.indexOf('('))}`;
                
                selectReq.innerHTML += `<option value="${shift.dateValue}">${thDisplay}</option>`;
            });
        } else {
            selectReq.innerHTML = '<option value="">ไม่มีเวรนอกเวลาในอนาคต</option>';
        }
        
        // รีเซ็ตช่อง 2 และ 3
        document.getElementById('swapTargetId').innerHTML = '<option value="">-- กรุณาเลือกวันที่ก่อน --</option>';
        document.getElementById('swapTargetId').disabled = true;
        document.getElementById('swapDateTarget').innerHTML = '<option value="">-- กรุณาเลือกเพื่อนก่อน --</option>';
        document.getElementById('swapDateTarget').disabled = true;
    })
    .catch(err => {
        console.error(err);
        selectReq.innerHTML = '<option value="">เกิดข้อผิดพลาด ดึงข้อมูลไม่สำเร็จ</option>';
    });
});

// เมื่อเลือกช่องที่ 1 (วันที่ตัวเอง) -> ให้โหลดรายชื่อเพื่อนที่ว่าง (ช่องที่ 2)
document.getElementById('swapDateReq').addEventListener('change', (e) => {
    let reqDate = e.target.value;
    let currentUid = currentUser.RamaID || currentUser.ramaid || currentUser.id;
    const selectTargetUser = document.getElementById('swapTargetId');
    
    if (!reqDate) {
        selectTargetUser.innerHTML = '<option value="">-- กรุณาเลือกวันที่ก่อน --</option>';
        selectTargetUser.disabled = true;
        document.getElementById('swapDateTarget').innerHTML = '<option value="">-- กรุณาเลือกเพื่อนก่อน --</option>';
        document.getElementById('swapDateTarget').disabled = true;
        return;
    }

    selectTargetUser.disabled = false;
    selectTargetUser.innerHTML = '<option value="">กำลังค้นหาเพื่อนที่ว่าง...</option>';
    
    // 🌟 เพิ่ม { method: 'GET', redirect: 'follow' }
    fetch(`${SCRIPT_URL}?action=get_eligible_targets&uid=${currentUid}&req_date=${reqDate}`, {
      method: 'GET',
      redirect: 'follow'
    })
      .then(res => res.json())
      .then(res => {
          selectTargetUser.innerHTML = '<option value="">-- เลือกเพื่อนมาแทน --</option>';
          if (res.data && res.data.length > 0) {
              res.data.forEach(t => {
                  selectTargetUser.innerHTML += `<option value="${t.id}">${t.name}</option>`;
              });
          } else {
              selectTargetUser.innerHTML = '<option value="">(ไม่มีเพื่อนชั้นปีเดียวกันที่ว่างเลย)</option>';
          }
      })
      .catch(err => console.error(err));
});

// เมื่อเลือกช่องที่ 2 (ชื่อเพื่อน) -> ให้โหลดเวรของเพื่อนคนนั้นมาแสดงให้เลือกคืน (ช่องที่ 3)
document.getElementById('swapTargetId').addEventListener('change', (e) => {
    let targetUid = e.target.value;
    const selectDateTarget = document.getElementById('swapDateTarget');
    
    if (!targetUid) {
        selectDateTarget.innerHTML = '<option value="">-- กรุณาเลือกเพื่อนก่อน --</option>';
        selectDateTarget.disabled = true;
        return;
    }

    selectDateTarget.disabled = false;
    selectDateTarget.innerHTML = '<option value="">กำลังโหลดเวรของเพื่อน...</option>';
    
    // 🌟 เพิ่ม { method: 'GET', redirect: 'follow' }
    fetch(`${SCRIPT_URL}?action=get_swap_shifts&uid=${targetUid}`, {
      method: 'GET',
      redirect: 'follow'
    })
      .then(res => res.json())
      .then(res => {
          selectDateTarget.innerHTML = '<option value="">-- แลกให้เปล่า (ไม่คืนเวร) --</option>';
          if (res.data && res.data.length > 0) {
              res.data.forEach(shift => {
                  let parts = shift.display.split(' ')[0].split('/');
                  let thYear = parseInt(parts[2]) + 543;
                  let thDisplay = `${parts[0]}/${parts[1]}/${thYear} ${shift.display.substring(shift.display.indexOf('('))}`;
                  
                  selectDateTarget.innerHTML += `<option value="${shift.dateValue}">${thDisplay}</option>`;
              });
          }
      })
      .catch(err => console.error(err));
});

// เมื่อเลือกช่องที่ 2 (ชื่อเพื่อน) -> ให้โหลดเวรของเพื่อนคนนั้นมาแสดงให้เลือกคืน (ช่องที่ 3)
document.getElementById('swapTargetId').addEventListener('change', (e) => {
    let targetUid = e.target.value;
    const selectDateTarget = document.getElementById('swapDateTarget');
    
    if (!targetUid) {
        selectDateTarget.innerHTML = '<option value="">-- กรุณาเลือกเพื่อนก่อน --</option>';
        selectDateTarget.disabled = true;
        return;
    }

    selectDateTarget.disabled = false;
    selectDateTarget.innerHTML = '<option value="">กำลังโหลดเวรของเพื่อน...</option>';
    
    // ดึงตารางเวร โดยใช้ id ของเพื่อนเป้าหมายแทน
    fetch(`${SCRIPT_URL}?action=get_swap_shifts&uid=${targetUid}`)
      .then(res => res.json())
      .then(res => {
          selectDateTarget.innerHTML = '<option value="">-- แลกให้เปล่า (ไม่คืนเวร) --</option>';
          if (res.data && res.data.length > 0) {
              res.data.forEach(shift => {
                  let parts = shift.display.split(' ')[0].split('/');
                  let thYear = parseInt(parts[2]) + 543;
                  let thDisplay = `${parts[0]}/${parts[1]}/${thYear} ${shift.display.substring(shift.display.indexOf('('))}`;
                  
                  selectDateTarget.innerHTML += `<option value="${shift.dateValue}">${thDisplay}</option>`;
              });
          }
      });
});

// ==========================================
// 9. SUBMIT SWAP REQUEST (ส่งคำขอแลกเวร)
// ==========================================
document.getElementById('btnSubmitSwap').addEventListener('click', () => {
    // 1. อ่านค่าจาก Dropdown ทั้ง 3 ช่อง
    const dateReq = document.getElementById('swapDateReq').value;
    const targetId = document.getElementById('swapTargetId').value;
    const dateTarget = document.getElementById('swapDateTarget').value; // อาจจะว่างได้ ถ้าแลกให้เปล่า
    const currentUid = currentUser.RamaID || currentUser.ramaid || currentUser.id;

    // 2. เช็คว่าเลือกข้อมูลครบไหม
    if (!dateReq || !targetId) {
        return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกเวรของคุณ และเพื่อนที่จะมาแทนให้ครบถ้วน', 'warning');
    }

    // 3. ถามยืนยันก่อนส่ง
    Swal.fire({
        title: 'ยืนยันการส่งคำขอ?',
        text: "ระบบจะส่งข้อความแจ้งเตือนไปหาเพื่อนของคุณเพื่อรอการอนุมัติ",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ส่งคำขอเลย',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#ffc107',
        color: '#000'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});
            
            // 🔥 เพิ่มตัวกัน Browser แอบจำค่าเก่า
            const timeBuster = new Date().getTime();
            
            // 4. ส่งข้อมูลไปให้ Google Apps Script
            fetch(`${SCRIPT_URL}?action=submit_swap&req_id=${currentUid}&target_id=${targetId}&date_req=${dateReq}&date_target=${dateTarget}&t=${timeBuster}`, {
                method: 'GET',
                redirect: 'follow'
            })
            .then(res => res.json())
            .then(res => {
                if(res.status === "success") {
                    Swal.fire('สำเร็จ!', 'ส่งคำขอแลกเวรเรียบร้อยแล้ว รอเพื่อนอนุมัติได้เลย', 'success');
                    
                    // 🔥 หน่วงเวลา 1.5 วินาที เพื่อให้ Google Sheets บันทึกแถวใหม่เสร็จก่อน แล้วค่อยดึงข้อมูลใหม่
                    setTimeout(() => {
                        loadOutgoingSwapsList();
                    }, 1500);
                    
                    // รีเซ็ตฟอร์มกลับเป็นค่าเริ่มต้น
                    document.getElementById('swapDateReq').value = '';
                    document.getElementById('swapTargetId').innerHTML = '<option value="">-- กรุณาเลือกวันที่ด้านบนก่อน --</option>';
                    document.getElementById('swapTargetId').disabled = true;
                    document.getElementById('swapDateTarget').innerHTML = '<option value="">-- กรุณาเลือกเพื่อนด้านบนก่อน --</option>';
                    document.getElementById('swapDateTarget').disabled = true;
                } else {
                    Swal.fire('ข้อผิดพลาด', res.message, 'error');
                }
            })
            .catch(err => Swal.fire('ข้อผิดพลาด', err.message, 'error'));
        }
    });
});

// ==========================================
// ระบบดึงคำขอที่เราเป็นคนส่ง (Outgoing Swaps) - เปิดโหมด Debug
// ==========================================
function loadOutgoingSwapsList() {
  let currentUid = currentUser.RamaID || currentUser.ramaid || currentUser.id;
  if (!currentUid) return;
  
  const container = document.getElementById('outgoingSwapsContainer');
  const list = document.getElementById('outgoingSwapsList');
  
  if (!container || !list) {
      console.error("❌ หา HTML กล่อง Outgoing ไม่เจอ! (ลืมใส่ใน index.html หรือเปล่า?)");
      return;
  }
  
  const timeBuster = new Date().getTime();
  console.log("กำลังดึงข้อมูล Outgoing ของ UID:", currentUid);
  
  fetch(`${SCRIPT_URL}?action=check_outgoing_swaps&uid=${currentUid}&t=${timeBuster}`, {
      method: 'GET',
      redirect: 'follow'
  })
    .then(res => res.json())
    .then(res => {
      console.log("📥 ข้อมูล Outgoing ที่ระบบตอบกลับมา:", res); // ดูว่ามี Data ไหม

      if (res.status === "success" && res.data && res.data.length > 0) {
        container.style.display = 'block'; 
        let html = '';
        
        res.data.forEach(req => {
          let fmtReqDate = req.reqDate ? formatThaiFullDate(req.reqDate) : '';
          let fmtTargetDate = req.targetDate ? formatThaiFullDate(req.targetDate) : '';
          let targetDateHtml = req.targetDate ? `<br><small class="text-secondary">📅 วันที่คุณจะไปคืนเวร: <span class="fw-bold">${fmtTargetDate || req.targetDate}</span></small>` : '';

          html += `
            <li class="list-group-item d-flex justify-content-between align-items-center bg-light">
              <div>
                <strong class="text-dark"><i class="bi bi-arrow-right-circle-fill text-warning me-1"></i>ส่งถึง: ${req.targetName}</strong>
                <br><small class="text-muted">🔴 วันที่คุณต้องการแลก: <span class="text-danger fw-bold">${fmtReqDate || req.reqDate}</span></small>
                ${targetDateHtml}
              </div>
              <div class="ms-2">
                <button class="btn btn-sm btn-outline-danger rounded-pill shadow-sm" onclick="cancelOutgoingSwap('${req.reqId}')">
                  ยกเลิกคำขอ
                </button>
              </div>
            </li>`;
        });
        list.innerHTML = html;
      } else {
        container.style.display = 'none'; 
      }
    })
    .catch(err => console.error("❌ Fetch Error:", err));
}

// ฟังก์ชันสำหรับกดยกเลิกคำขอของตัวเอง
window.cancelOutgoingSwap = function(reqId) {
  Swal.fire({
    title: 'ยกเลิกคำขอแลกเวร?',
    text: "คำขอนี้จะถูกยกเลิก และส่งกลับไปไม่ได้อีก",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ยกเลิกคำขอ',
    cancelButtonText: 'ปิด',
    confirmButtonColor: '#dc3545'
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'กำลังยกเลิก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});
      const timeBuster = new Date().getTime();
      
      // ส่งสถานะ Cancelled ไปให้ระบบ
      fetch(`${SCRIPT_URL}?action=update_swap_status&req_id=${reqId}&status=Cancelled&t=${timeBuster}`, { 
          method: 'GET',
          redirect: 'follow'
      })
        .then(res => res.json())
        .then(res => {
           if(res.status === "success") {
             Swal.fire('สำเร็จ!', 'ยกเลิกคำขอแลกเวรเรียบร้อยแล้ว', 'success');
             loadOutgoingSwapsList(); // โหลดรายการใหม่ทันที
           } else {
             Swal.fire('ข้อผิดพลาด', res.message, 'error');
           }
        })
        .catch(err => Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'));
    }
  });
}

// =====================================
// ฟังก์ชันค้นหารายชื่อบุคลากร (Directory) แบบสมบูรณ์
// =====================================
document.getElementById('btnSearchDir').addEventListener('click', () => {
  const keyword = document.getElementById('dirSearchInput').value.trim();
  
  Swal.fire({ title: 'กำลังค้นหาประวัติ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});

  fetch(`${SCRIPT_URL}?action=search_directory&keyword=${encodeURIComponent(keyword)}`, {
    method: 'GET',
    redirect: 'follow'
  })
    .then(response => response.json())
    .then(res => {
      if(res.status !== "success") throw new Error(res.message);
      Swal.close();
      
      const container = document.getElementById('dirResultContainer');
      const list = document.getElementById('dirResultList');
      container.classList.remove('d-none');
      list.innerHTML = '';
      
      if(res.data.length === 0) {
          list.innerHTML = '<li class="list-group-item text-muted text-center">ไม่พบชื่อบุคลากรนี้</li>';
          return;
      }
      
       res.data.forEach(user => {
          let role = user.role || "ไม่ระบุตำแหน่ง";
          let codeBadge = user.code ? `<span class="badge bg-info text-dark ms-2"><i class="bi bi-tag-fill"></i> ${user.code}</span>` : "";
          let email = user.email ? `<span class="ms-3"><a href="mailto:${user.email}" class="text-decoration-none text-muted"><i class="bi bi-envelope-fill text-warning"></i> ${user.email}</a></span>` : "";
          
          // 🌟 สร้างปุ่มโทรศัพท์ 3 สี ตามที่ขอครับ (เขียว, น้ำเงิน, แดง)
          let btnMobile = user.mobile ? `<a href="tel:${user.mobile}" class="btn btn-sm btn-success rounded-pill px-3 shadow-sm me-1 mb-1 fw-bold"><i class="bi bi-telephone-fill"></i> Mobile: ${user.mobile}</a> ` : "";
          let btnPct = user.pct ? `<a href="tel:022011000,${user.pct}" class="btn btn-sm btn-primary rounded-pill px-3 shadow-sm me-1 mb-1 fw-bold"><i class="bi bi-telephone-outbound"></i> PCT: ${user.pct}</a> ` : "";
          let btnPct10 = user.pct10 ? `<a href="tel:${user.pct10}" class="btn btn-sm btn-danger rounded-pill px-3 shadow-sm me-1 mb-1 fw-bold"><i class="bi bi-phone-vibrate-fill"></i> PCT10: ${user.pct10}</a> ` : "";
          
          let phoneSection = (btnMobile || btnPct || btnPct10) 
              ? `<div class="mt-2">${btnMobile}${btnPct}${btnPct10}</div>` 
              : `<div class="text-muted small mt-2">ไม่มีข้อมูลติดต่อ</div>`;

          list.innerHTML += `
            <li class="list-group-item bg-light mb-2 rounded shadow-sm border-0">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <strong class="text-primary fs-5">${user.name}</strong>
                <div>
                    <span class="badge bg-secondary">${role}</span>
                    ${codeBadge}
                </div>
              </div>
              <div class="small text-muted mb-1">
                <i class="bi bi-building me-1 text-info"></i> สังกัด: ${user.department || "-"}
                ${email}
              </div>
              ${phoneSection}
            </li>
          `;
      }); // ปิด forEach
    }) // ปิด then
    .catch(err => Swal.fire('ข้อผิดพลาด', err.message, 'error'));
}); // ปิด addEventListener
