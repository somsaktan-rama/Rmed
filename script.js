  // ตัวแปรควบคุมโหมด
  let currentUser = null;

  // ฟังก์ชันเริ่มต้นทำงานเมื่อโหลดหน้าเว็บเสร็จ
  window.onload = function() {
    checkLocalLogin();
  };

  // ตรวจสอบว่าเคย Login ไว้ในเบราว์เซอร์นี้หรือไม่
  function checkLocalLogin() {
    const savedRamaId = localStorage.getItem('savedRamaId');
    if (savedRamaId) {
      // ถ้าเคยมี ลองเอาไปตรวจสอบกับระบบหลังบ้าน
      verifyRamaId(savedRamaId, false);
    } else {
      // ถ้าไม่มี ให้โชว์หน้า Login
      document.getElementById('loginSection').classList.remove('d-none');
      document.getElementById('appSection').classList.add('d-none');
    }
  }

  // จัดการเมื่อกดปุ่ม Login ด้วย RamaID (เปลี่ยนชื่อฟังก์ชันหลังบ้านไม่ให้ผูกบัญชี)
  document.getElementById('btnLogin').addEventListener('click', () => {
    const ramaId = document.getElementById('inputRamaId').value.trim();
    if (!ramaId) {
      return Swal.fire('แจ้งเตือน', 'กรุณากรอก RamaID', 'warning');
    }
    verifyRamaId(ramaId, true);
  });

  // ฟังก์ชันตรวจสอบ RamaID กับ Backend
  function verifyRamaId(ramaId, showSuccessAlert) {
    if (showSuccessAlert) {
       Swal.fire({ title: 'กำลังตรวจสอบ...', didOpen: () => { Swal.showLoading() }});
    }

    google.script.run
      .withSuccessHandler(res => {
        if (res.success) {
          currentUser = res.user;
          // บันทึก RamaID ลงเครื่อง (จะหายไปถ้า Clear Data เบราว์เซอร์)
          localStorage.setItem('savedRamaId', currentUser.RamaID || currentUser.ramaid);
          
          if (showSuccessAlert) {
            Swal.fire({
              title: 'สำเร็จ',
              text: 'เข้าสู่ระบบเรียบร้อย',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
          } else {
            Swal.close(); // ปิด Loading กรณี Auto Login
          }
          showAppMain();
        } else {
          // กรณีหา RamaID ไม่เจอ
          localStorage.removeItem('savedRamaId');
          Swal.fire('ข้อผิดพลาด', res.message || 'ไม่พบ RamaID นี้ในระบบ', 'error');
          document.getElementById('loginSection').classList.remove('d-none');
          document.getElementById('appSection').classList.add('d-none');
        }
      })
      .withFailureHandler(err => {
        localStorage.removeItem('savedRamaId');
        Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
        document.getElementById('loginSection').classList.remove('d-none');
        document.getElementById('appSection').classList.add('d-none');
      })
      .checkTestLogin(ramaId); // เรียกฟังก์ชันใหม่ที่ Backend
  }

  // สลับหน้าจอเป็น Main App
  function showAppMain() {
    document.getElementById('loginSection').classList.add('d-none');
    document.getElementById('appSection').classList.remove('d-none');
    
    // ดึงชื่อเต็มมาแสดงบน Navbar
    let navName = currentUser.Name || currentUser.name || "ไม่ระบุชื่อ";
    let navRole = currentUser.RoleYear || currentUser.roleyear || "";
    document.getElementById('displayUserName').innerText = `${navName} (${navRole})`;
    
    initDatePicker();
    loadDashboard();
  }

  // =====================================
  // ปฏิทินแสดงเป็น วัน/เดือน/ปี พ.ศ. (ด้วย Flatpickr)
  // =====================================
  function initDatePicker() {
    // กำหนดรูปแบบให้ Flatpickr 
    const flatpickrConfig = {
      locale: "th",         // ภาษาไทย
      dateFormat: "Y-m-d",  // ค่าที่จะนำไปใช้คำนวณในระบบหลังบ้าน (เก็บแบบสากล)
      altInput: true,       // ให้สร้างช่อง Input จำลองมาโชว์ให้ User เห็นแทน
      altFormat: "d/m/Y",   // รูปแบบที่ User จะเห็น (DD/MM/YYYY)
      disableMobile: true,  // บังคับให้ใช้ดีไซน์ของ Flatpickr เองบนมือถือ (ไม่ใช้ default ของมือถือเพราะแก้ พ.ศ. ไม่ได้)
      formatDate: (date, formatStr) => {
        // ดักจับการจัดรูปแบบเพื่อแปลงปี ค.ศ. เป็น พ.ศ. เฉพาะสำหรับ altFormat 
        if (formatStr === "d/m/Y") {
          let d = date.getDate().toString().padStart(2, '0');
          let m = (date.getMonth() + 1).toString().padStart(2, '0');
          let y = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
          return `${d}/${m}/${y}`;
        }
        return flatpickr.formatDate(date, formatStr); 
      }
    };

    // 1. ช่องปฏิทินของ "หน้าค้นหา"
    let searchPicker = flatpickr("#searchDateInput", {
      ...flatpickrConfig,
      defaultDate: "today" // ตั้งค่า Default ให้เป็น "วันนี้"
    });

    // 2. ช่องปฏิทินของ "หน้าแลกเวร" (วันที่ขอให้คนอื่นมาแทน)
    flatpickr("#swapDateReq", {
      ...flatpickrConfig
    });

    // 3. ช่องปฏิทินของ "หน้าแลกเวร" (วันที่เราจะไปอยู่คืน)
    flatpickr("#swapDateTarget", {
      ...flatpickrConfig
    });
  }

  function loadDashboard() {
    document.getElementById('currRotationContent').innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"></div> กำลังดึงข้อมูล...';
    document.getElementById('extraShiftsContent').innerHTML = '<div class="spinner-border spinner-border-sm text-danger" role="status"></div> กำลังดึงข้อมูล...';

    google.script.run
      .withSuccessHandler(res => {
        // --- วาดข้อมูล In-time Rotation ---
        if (res.currentRotationInfo) {
          document.getElementById('currRotationContent').innerHTML = `
            <div class="d-flex align-items-center">
              <div class="fs-1 me-3">🏥</div>
              <div>
                <h4 class="mb-0 text-primary fw-bold">${res.currentRotationInfo.ward}</h4>
                <small class="text-muted">Rotation: ${res.currentRotationInfo.rotationNo} | <span class="text-info">ค้นหาเวรด้วยคำว่า: "${res.currentRotationInfo.debugName}"</span></small>
              </div>
            </div>
          `;
        }

        // --- วาดข้อมูล 5 เวรถัดไป ---
        if (!res.extraShifts || res.extraShifts.length === 0) {
          document.getElementById('extraShiftsContent').innerHTML = `
            <div class="alert alert-light border text-center text-success mb-0">
              ไม่มีเวรนอกเวลาในระบบ <br>
              <small class="text-muted">(ตรวจสอบชีต extra ว่ามีคำว่า "${res.currentRotationInfo.debugName}" หรือไม่)</small>
            </div>`;
        } else {
          let shiftHtml = '<div class="list-group">';
          
          res.extraShifts.forEach(shift => {
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
      .withFailureHandler(err => {
        document.getElementById('currRotationContent').innerHTML = '<span class="text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</span>';
        document.getElementById('extraShiftsContent').innerHTML = `<span class="text-danger">${err.message}</span>`;
      })
      .getDashboardData(currentUser.RamaID || currentUser.ramaid); 
  }

  // =====================================
  // Logic ฟอร์มแลกเวร
  // =====================================
  document.getElementById('swapDateReq').addEventListener('change', function(e) {
    const reqDate = e.target.value;
    const targetSelect = document.getElementById('swapTarget');
    const badgeContainer = document.getElementById('dateBadgeContainer');
    
    targetSelect.innerHTML = '<option value="">กำลังโหลดข้อมูลแพทย์ที่สามารถแลกได้...</option>';
    targetSelect.disabled = true;
    badgeContainer.innerHTML = '';

    if (!reqDate) return;

    google.script.run
      .withSuccessHandler(res => {
        // วาด Badge ประเภทของวัน
        let badgeClass = res.dateInfo.type === 'holiday' ? 'badge-holiday' : 
                         res.dateInfo.type === 'weekend' ? 'badge-weekend' : 'badge-workday';
        
        badgeContainer.innerHTML = `<span class="badge ${badgeClass} fs-6">${res.dateInfo.desc}</span>`;

        // เติม Dropdown รายชื่อแพทย์
        if (res.targets.length === 0) {
          targetSelect.innerHTML = '<option value="">ไม่มีแพทย์ในชั้นปีที่สามารถสลับได้</option>';
        } else {
          let options = '<option value="">-- เลือกแพทย์ --</option>';
          res.targets.forEach(t => {
            options += `<option value="${t.RamaID}">${t.Name}</option>`;
          });
          targetSelect.innerHTML = options;
          targetSelect.disabled = false;
        }
      })
      .withFailureHandler(err => {
        Swal.fire('ข้อผิดพลาด', 'ดึงข้อมูลไม่สำเร็จ: ' + err.message, 'error');
      })
      .getEligibleTargetsForSwap(currentUser.RamaID, reqDate);
  });

  // ยืนยันการแลกเวร
  document.getElementById('btnSubmitSwap').addEventListener('click', () => {
    const dateReq = document.getElementById('swapDateReq').value;
    const targetId = document.getElementById('swapTarget').value;
    const dateTarget = document.getElementById('swapDateTarget').value;

    if (!dateReq || !targetId) {
      return Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกวันที่และแพทย์ที่ต้องการแลกด้วย', 'warning');
    }

    const targetName = document.getElementById('swapTarget').options[document.getElementById('swapTarget').selectedIndex].text;

    Swal.fire({
      title: 'ยืนยันการแลกเวร',
      text: `คุณต้องการขอแลกเวรวันที่ ${dateReq} กับ ${targetName} ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ffc107',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังส่งคำขอ...', didOpen: () => { Swal.showLoading() }});
        
        google.script.run
          .withSuccessHandler(res => {
            Swal.fire('ส่งคำขอสำเร็จ!', 'ระบบบันทึกสถานะ Pending เรียบร้อย รอการยืนยัน', 'success');
            // Reset Form
            document.getElementById('swapDateReq').value = '';
            document.getElementById('swapTarget').innerHTML = '<option value="">-- กรุณาเลือกวันที่ด้านบนก่อน --</option>';
            document.getElementById('swapTarget').disabled = true;
            document.getElementById('swapDateTarget').value = '';
            document.getElementById('dateBadgeContainer').innerHTML = '';
          })
          .withFailureHandler(err => {
            Swal.fire('ข้อผิดพลาด', err.message, 'error');
          })
          .submitSwapRequest({
            requesterId: currentUser.RamaID,
            targetId: targetId,
            dateRequester: dateReq,
            dateTarget: dateTarget
          });
      }
    });
  });

// =====================================
  // Logic ค้นหาตารางงาน (Search Tab)
  // =====================================
  let currentSearchResults = null; // เก็บผลการค้นหาชั่วคราวเพื่อทำ Filter

  document.getElementById('btnSearchSchedule').addEventListener('click', () => {
    const searchDate = document.getElementById('searchDateInput').value;
    if (!searchDate) {
      return Swal.fire('แจ้งเตือน', 'กรุณาเลือกวันที่ต้องการค้นหา', 'warning');
    }

    // แสดง Loading
    Swal.fire({
      title: 'กำลังค้นหาข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading() }
    });

    google.script.run
      .withSuccessHandler(res => {
        Swal.close();
        currentSearchResults = res; // เก็บข้อมูลไว้สำหรับ Filter
        document.getElementById('searchResultsContainer').classList.remove('d-none');
        document.getElementById('filterWardContainer').classList.remove('d-none');
        
        // อัปเดตป้าย Rotation
        document.getElementById('searchRotBadge').innerText = res.targetRotation || "ไม่พบช่วง Rotation";

        populateWardFilter(res.inTime, res.extraTime);
        renderSearchResults('', res.inTime, res.extraTime); // ส่ง '' เพื่อแสดงทั้งหมด
      })
      .withFailureHandler(err => {
        Swal.fire('ข้อผิดพลาด', err.message, 'error');
      })
      .searchScheduleByDate(searchDate);
  });

  // สร้างตัวเลือก Filter ตามแผนกที่มีคนอยู่ในวันนั้น
  function populateWardFilter(inTimeData, extraData) {
    const select = document.getElementById('filterWardSelect');
    let wards = new Set(); // ใช้ Set เพื่อตัดแผนกที่ซ้ำกันทิ้ง
    
    inTimeData.forEach(item => wards.add(item.ward));
    extraData.forEach(item => wards.add(item.ward));

    let options = '<option value="">-- แสดงทุกแผนก / สถานที่ --</option>';
    Array.from(wards).sort().forEach(w => {
      options += `<option value="${w}">${w}</option>`;
    });
    
    select.innerHTML = options;
  }

  // ดัก Event เมื่อมีการเปลี่ยน Dropdown แผนก
  document.getElementById('filterWardSelect').addEventListener('change', (e) => {
    const selectedWard = e.target.value;
    if (currentSearchResults) {
      renderSearchResults(selectedWard, currentSearchResults.inTime, currentSearchResults.extraTime);
    }
  });

  // ฟังก์ชันวาดผลการค้นหาลงหน้าจอ
  function renderSearchResults(filterWard, inTimeData, extraData) {
    const inTimeUl = document.getElementById('searchInTimeResult');
    const extraUl = document.getElementById('searchExtraTimeResult');

    // กรองข้อมูลตามที่เลือก (ถ้ามี)
    let filteredInTime = filterWard ? inTimeData.filter(item => item.ward === filterWard) : inTimeData;
    let filteredExtra = filterWard ? extraData.filter(item => item.ward === filterWard) : extraData;

    // --- วาดในเวลา ---
    if (filteredInTime.length === 0) {
      inTimeUl.innerHTML = '<li class="list-group-item text-muted text-center py-3">ไม่พบรายชื่อ</li>';
    } else {
      let html = '';
      // Group by Ward เพื่อความสวยงาม
      const groupedInTime = groupBy(filteredInTime, 'ward');
      for (const [wardName, people] of Object.entries(groupedInTime)) {
        html += `<li class="list-group-item bg-light text-primary fw-bold">${wardName}</li>`;
        people.forEach(p => {
          html += `<li class="list-group-item"><i class="bi bi-person-fill text-secondary me-2"></i>${p.name} <span class="badge bg-secondary ms-1">${p.role}</span></li>`;
        });
      }
      inTimeUl.innerHTML = html;
    }

    // --- วาดนอกเวลา (เวร) ---
    if (filteredExtra.length === 0) {
      extraUl.innerHTML = '<li class="list-group-item text-muted text-center py-3">ไม่พบรายชื่อ</li>';
    } else {
      let html = '';
      const groupedExtra = groupBy(filteredExtra, 'ward');
      for (const [wardName, people] of Object.entries(groupedExtra)) {
        html += `<li class="list-group-item bg-light text-danger fw-bold">${wardName}</li>`;
        people.forEach(p => {
          html += `<li class="list-group-item"><i class="bi bi-moon-stars-fill text-warning me-2"></i>${p.name}</li>`;
        });
      }
      extraUl.innerHTML = html;
    }
  }

// Helper Function สำหรับจัดกลุ่ม Array
  function groupBy(array, key) {
    return array.reduce((result, currentValue) => {
      (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
      return result;
    }, {});
  }

  // =====================================
  // Logic ออกจากระบบ (เคลียร์ Cache)
  // =====================================
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
        // ล้าง Cache ใน localStorage
        localStorage.removeItem('savedRamaId');
        currentUser = null; 
        
        // ซ่อนหน้า Dashboard กลับไปหน้า Login
        document.getElementById('appSection').classList.add('d-none');
        document.getElementById('loginSection').classList.remove('d-none');
        document.getElementById('inputRamaId').value = ''; 
        
        Swal.fire({
          title: 'สำเร็จ',
          text: 'ออกจากระบบเรียบร้อยแล้ว',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  });

  // Start App (เปลี่ยนมาเรียก Local Login แทน LIFF)
  window.onload = function() {
    checkLocalLogin();
  };
