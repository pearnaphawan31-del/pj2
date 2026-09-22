// ==========================================
// 1. CONFIG: ตั้งค่าการเชื่อมต่อ Supabase
// ==========================================
const SUPABASE_URL = 'https://kvprhbaiyjtmpyumygla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cHJoYmFpeWp0bXB5dW15Z2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTQxNTUsImV4cCI6MjEwNTYzMDE1NX0.gRjs-7VBBhsjonKowLJaGcGu4KBu8dy3vROqkyyRiSY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentGoalId = null;
let currentGoalData = null;

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
// ดึง Query Parameter จาก URL (เช่น ?id=1)
function getGoalIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// ==========================================
// 3. MAIN PAGE LOGIC (สำหรับหน้า main_page.html)
// ==========================================

// 3.1 ดึงรายการ Goals ทั้งหมดจากตาราง saving_goal
async function fetchGoals() {
    const goalsList = document.getElementById('goalsList');
    if (!goalsList) return;

    const { data: goals, error } = await supabaseClient
        .from('saving_goal') // เปลี่ยนเป็น saving_goal
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('Error fetching goals:', error);
        goalsList.innerHTML = `<p style="text-align: center; color: #ef4444;">Failed to load goals. (${error.message})</p>`;
        return;
    }

    if (!goals || goals.length === 0) {
        goalsList.innerHTML = '<p style="text-align: center; color: #38bdf8;">No goals found. Create one above! 🚀</p>';
        return;
    }

    goalsList.innerHTML = ''; // ล้างข้อมูล Loading

    goals.forEach(goal => {
        const current = goal.current_amount || 0;
        const target = goal.target_amount || 1;
        const percent = Math.min(Math.round((current / target) * 100), 100);

        const goalCard = `
            <a href="detail_page.html?id=${goal.id}" class="cloud-card">
                <div class="cloud-icon">☁️</div>
                <div class="cloud-info">
                    <h3>${goal.title}</h3>
                    <p><span>${current.toLocaleString()}</span> / ${target.toLocaleString()} ฿</p>
                </div>
                <div class="cloud-badge">${percent}%</div>
            </a>
        `;
        goalsList.insertAdjacentHTML('beforeend', goalCard);
    });
}

// 3.2 สร้าง Goal ใหม่ลงตาราง saving_goal
function initCreateGoalForm() {
    const createGoalForm = document.getElementById('createGoalForm');
    if (!createGoalForm) return;

    createGoalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titleInput = document.getElementById('goalName');
        const targetInput = document.getElementById('goalTarget');

        const title = titleInput.value.trim();
        const targetAmount = parseFloat(targetInput.value);

        if (!title || !targetAmount || targetAmount <= 0) {
            alert('Please enter valid details.');
            return;
        }

        const { data, error } = await supabaseClient
            .from('saving_goal') // เปลี่ยนเป็น saving_goal
            .insert([
                {
                    title: title,
                    target_amount: targetAmount,
                    current_amount: 0
                }
            ]);

        if (error) {
            console.error('Error creating goal:', error);
            alert(`Failed to create goal: ${error.message}`);
        } else {
            alert('New Cloud Goal created successfully! 🎉');
            createGoalForm.reset();
            fetchGoals(); // โหลดรายการใหม่ทันที
        }
    });
}

// ==========================================
// 4. DETAIL PAGE LOGIC (สำหรับหน้า detail_page.html)
// ==========================================

// 4.1 โหลดข้อมูล Detail ตาม ID จากตาราง saving_goal
async function loadGoalDetail() {
    currentGoalId = getGoalIdFromURL();

    if (!currentGoalId) {
        alert('Goal ID not found.');
        window.location.href = 'main_page.html';
        return;
    }

    const { data: goal, error } = await supabaseClient
        .from('saving_goal') // เปลี่ยนเป็น saving_goal
        .select('*')
        .eq('id', currentGoalId)
        .single();

    if (error || !goal) {
        console.error('Error loading goal detail:', error);
        alert('Failed to load goal details.');
        window.location.href = 'main_page.html';
        return;
    }

    currentGoalData = goal;
    renderGoalDetail(goal);
}

// 4.2 เรนเดอร์ข้อมูลลง HTML
function renderGoalDetail(goal) {
    const current = goal.current_amount || 0;
    const target = goal.target_amount || 1;
    const percent = Math.min(Math.round((current / target) * 100), 100);
    const remain = Math.max(target - current, 0);

    const titleEl = document.getElementById('detailGoalTitle');
    const currentEl = document.getElementById('detailCurrent');
    const targetEl = document.getElementById('detailTarget');
    const percentEl = document.getElementById('detailPercent');
    const remainEl = document.getElementById('detailRemain');
    const progressBar = document.getElementById('detailProgressBar');
    const midEl = document.getElementById('detailMid');
    const endEl = document.getElementById('detailEnd');
    const avgEl = document.getElementById('detailAvg');

    if (titleEl) titleEl.innerText = goal.title;
    if (currentEl) currentEl.innerText = current.toLocaleString();
    if (targetEl) targetEl.innerText = target.toLocaleString();
    if (percentEl) percentEl.innerText = percent;
    if (remainEl) remainEl.innerText = remain.toLocaleString();
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (midEl) midEl.innerText = `${(target / 2).toLocaleString()}฿`;
    if (endEl) endEl.innerText = `${target.toLocaleString()}฿`;
    if (avgEl) avgEl.innerText = Math.round(current / 9).toLocaleString();
}

// 4.3 ระบบฝากเงิน (Deposit) อัปเดตตาราง saving_goal
function initDepositForm() {
    const depositForm = document.getElementById('depositForm');
    if (!depositForm) return;

    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const depositInput = document.getElementById('depositAmount');
        const depositAmount = parseFloat(depositInput.value);

        if (!depositAmount || depositAmount <= 0) {
            alert('Please enter a valid deposit amount.');
            return;
        }

        const newTotal = (currentGoalData.current_amount || 0) + depositAmount;

        const { data, error } = await supabaseClient
            .from('saving_goal') // เปลี่ยนเป็น saving_goal
            .update({ current_amount: newTotal })
            .eq('id', currentGoalId);

        if (error) {
            console.error('Error adding deposit:', error);
            alert(`Failed to save money: ${error.message}`);
        } else {
            alert(`Deposit added successfully! (+${depositAmount.toLocaleString()} ฿) 🎉`);
            depositInput.value = '';
            loadGoalDetail(); // รีโหลดข้อมูลในหน้า Detail
        }
    });
}

// ==========================================
// 5. INITIALIZATION (เช็คหน้าเพื่อเรียกฟังก์ชันให้ถูกตัว)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // ถ้าพบ element ของหน้า Main Page
    if (document.getElementById('goalsList')) {
        fetchGoals();
        initCreateGoalForm();
    }

    // ถ้าพบ element ของหน้า Detail Page
    if (document.getElementById('detailGoalTitle')) {
        loadGoalDetail();
        initDepositForm();
    }
});