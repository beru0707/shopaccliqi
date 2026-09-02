const ITEMS_PER_PAGE = 16;
const SEARCH_DEBOUNCE_MS = 350;

let currentPage = 1;
let currentQuery = "";
let currentSort = "";
let totalPages = 1;
let editingId = null;
let searchDebounceTimer = null;
let currentItems = []; // danh sách acc đang hiển thị, dùng để modal "Xem" tra cứu thông tin

// Token + user hiện tại lấy từ localStorage
let authToken = localStorage.getItem("authToken") || null;
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

// ===== DOM chính =====
const grid = document.getElementById("grid");
const pagination = document.getElementById("pagination");
const search = document.getElementById("search");
const searchHints = document.getElementById("search-hints");
const sortSelect = document.getElementById("sort-select");
const toastContainer = document.getElementById("toast-container");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mainNav = document.getElementById("main-nav");

// Auth
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userDisplay = document.getElementById("user-display");
const loginModal = document.getElementById("login-modal");
const loginModalClose = document.getElementById("login-modal-close");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginSubmitBtn = document.getElementById("login-submit-btn");
const registerForm = document.getElementById("register-form");
const registerError = document.getElementById("register-error");
const registerSubmitBtn = document.getElementById("register-submit-btn");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");

// Lightbox (xem ảnh to + thông tin acc)
const modal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-img");
const modalClose = document.getElementById("modal-close");
const modalInfoTitle = document.getElementById("modal-info-title");
const modalInfoText = document.getElementById("modal-info-text");
const modalInfoNote = document.getElementById("modal-info-note");
const modalInfoSkins = document.getElementById("modal-info-skins");
const modalBuyBtn = document.getElementById("modal-buy-btn");
const modalSoldLabel = document.getElementById("modal-sold-label");
let currentModalItemId = null; // acc đang được xem trong modal, dùng khi bấm "Mua"

// Ví tiền (Wallet)
const walletBtn = document.getElementById("wallet-btn");
const walletBalanceDisplay = document.getElementById("wallet-balance-display");
const walletModal = document.getElementById("wallet-modal");
const walletModalClose = document.getElementById("wallet-modal-close");
const walletBalanceAmount = document.getElementById("wallet-balance-amount");
const openHistoryBtn = document.getElementById("open-history-btn");

// Lịch sử mua acc
const historyModal = document.getElementById("history-modal");
const historyModalClose = document.getElementById("history-modal-close");
const historyList = document.getElementById("history-list");

// CRUD acc
const addAccBtn = document.getElementById("add-acc-btn");
const importAccBtn = document.getElementById("import-acc-btn");
const adminMenu = document.getElementById("admin-menu");
const adminMenuBtn = document.getElementById("admin-menu-btn");
const adminMenuDropdown = document.getElementById("admin-menu-dropdown");
const crudModal = document.getElementById("crud-modal");
const crudModalClose = document.getElementById("crud-modal-close");
const cancelFormBtn = document.getElementById("cancel-form-btn");
const accForm = document.getElementById("acc-form");
const crudError = document.getElementById("crud-error");
const crudSubmitBtn = document.getElementById("crud-submit-btn");
const modalFormTitle = document.getElementById("modal-form-title");
const inputPrice = document.getElementById("acc-price");
const inputImage = document.getElementById("acc-image");
const inputInfo = document.getElementById("acc-info");
const inputSkins = document.getElementById("acc-skins");
const inputAdminNote = document.getElementById("acc-admin-note");
const inputGameUsername = document.getElementById("acc-game-username");
const inputGamePassword = document.getElementById("acc-game-password");

// Nhập acc từ CSV
const csvImportModal = document.getElementById("csv-import-modal");
const csvImportModalClose = document.getElementById("csv-import-modal-close");
const csvImportFile = document.getElementById("csv-import-file");
const csvImportError = document.getElementById("csv-import-error");
const csvImportPreview = document.getElementById("csv-import-preview");
const csvImportCancelBtn = document.getElementById("csv-import-cancel-btn");
const csvImportSubmitBtn = document.getElementById("csv-import-submit-btn");
let pendingBulkAccounts = [];

// Quản lý người dùng
const manageUsersBtn = document.getElementById("manage-users-btn");
const usersModal = document.getElementById("users-modal");
const usersModalClose = document.getElementById("users-modal-close");
const usersTableBody = document.getElementById("users-table-body");
const usersError = document.getElementById("users-error");
const addUserForm = document.getElementById("add-user-form");

// ================= TOAST =================

function showToast(message, type = "info") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    toastContainer.appendChild(el);

    setTimeout(() => {
        el.classList.add("leaving");
        setTimeout(() => el.remove(), 220);
    }, 3200);
}

// Menu điều hướng thu gọn trên điện thoại
if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener("click", () => {
        const isOpen = mainNav.classList.toggle("mobile-open");
        mobileMenuBtn.classList.toggle("active", isOpen);
        mobileMenuBtn.setAttribute("aria-expanded", String(isOpen));
    });

    mainNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            mainNav.classList.remove("mobile-open");
            mobileMenuBtn.classList.remove("active");
            mobileMenuBtn.setAttribute("aria-expanded", "false");
        });
    });
}

// ================= GỌI API =================

async function apiFetch(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    let res;
    try {
        res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    } catch (err) {
        throw new Error("Không thể kết nối tới máy chủ. Vui lòng kiểm tra API có đang chạy không.");
    }

    let data = null;
    try {
        data = await res.json();
    } catch (err) {
        // phản hồi không có body JSON (vd. lỗi mạng lạ)
    }

    if (!res.ok) {
        if (res.status === 401 && authToken) {
            // token hết hạn -> đăng xuất êm
            handleSessionExpired();
        }
        const error = new Error((data && data.error) || `Lỗi ${res.status}`);
        if (Array.isArray(data?.details)) error.details = data.details;
        throw error;
    }

    return data;
}

function handleSessionExpired() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showToast("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", "error");
}

// ================= AUTH: LOGIN / REGISTER / LOGOUT =================

// Cập nhật giao diện khi đăng nhập/đăng xuất
function updateAuthUI() {
    const userProfileTop = document.getElementById("user-profile-top");
    
    if (currentUser) {
        loginBtn.classList.add("hidden");
        logoutBtn.classList.remove("hidden");
        if (userProfileTop) userProfileTop.classList.remove("hidden");

        const isAdmin = currentUser.role === "admin";
        userDisplay.innerHTML = `${currentUser.username} ${isAdmin ? "▾" : ""}`;

        if (walletBalanceDisplay) {
            walletBalanceDisplay.textContent = formatPrice(currentUser.balance || 0);
        }
    } else {
        loginBtn.classList.remove("hidden");
        logoutBtn.classList.add("hidden");
        if (userProfileTop) userProfileTop.classList.add("hidden");
        if (adminMenuDropdown) adminMenuDropdown.classList.add("hidden");
    }
}

// Bắt sự kiện bấm vào Profile để ẩn/hiện Menu Admin
const userProfileTop = document.getElementById("user-profile-top");
if (userProfileTop && adminMenuDropdown) {
    userProfileTop.addEventListener("click", (e) => {
        if (currentUser && currentUser.role === "admin") {
            e.stopPropagation();
            adminMenuDropdown.classList.toggle("hidden");
        }
    });

    document.addEventListener("click", (e) => {
        if (!userProfileTop.contains(e.target)) {
            adminMenuDropdown.classList.add("hidden");
        }
    });
}

function switchAuthTab(tab) {
    const isLogin = tab === "login";
    tabLogin.classList.toggle("active", isLogin);
    tabRegister.classList.toggle("active", !isLogin);
    loginForm.classList.toggle("hidden", !isLogin);
    registerForm.classList.toggle("hidden", isLogin);
    loginError.textContent = "";
    registerError.textContent = "";
}

tabLogin.addEventListener("click", () => switchAuthTab("login"));
tabRegister.addEventListener("click", () => switchAuthTab("register"));

loginBtn.addEventListener("click", () => {
    switchAuthTab("login");
    loginModal.classList.add("active");
});

loginModalClose.addEventListener("click", closeLoginModal);

function closeLoginModal() {
    loginModal.classList.remove("active");
    loginForm.reset();
    registerForm.reset();
    loginError.textContent = "";
    registerError.textContent = "";
}

function setButtonLoading(btn, loading, label) {
    btn.disabled = loading;
    btn.innerHTML = loading ? `<span class="spinner"></span>Đang xử lý...` : label;
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        loginError.textContent = "Vui lòng nhập tên đăng nhập và mật khẩu.";
        return;
    }

    setButtonLoading(loginSubmitBtn, true);
    try {
        const data = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
        applySession(data.token, data.user);
        closeLoginModal();
        showToast(`Xin chào, ${data.user.username}!`, "success");
        fetchAndRenderAccounts();
    } catch (err) {
        loginError.textContent = err.message;
    } finally {
        setButtonLoading(loginSubmitBtn, false, "Đăng nhập");
    }
});

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerError.textContent = "";
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-password-confirm").value;

    if (password !== confirm) {
        registerError.textContent = "Mật khẩu nhập lại không khớp.";
        return;
    }

    setButtonLoading(registerSubmitBtn, true);
    try {
        const data = await apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
        applySession(data.token, data.user);
        closeLoginModal();
        showToast(`Tạo tài khoản thành công! Chào mừng ${data.user.username}.`, "success");
        fetchAndRenderAccounts();
    } catch (err) {
        registerError.textContent = err.message;
    } finally {
        setButtonLoading(registerSubmitBtn, false, "Tạo tài khoản");
    }
});

function applySession(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem("authToken", token);
    localStorage.setItem("currentUser", JSON.stringify(user));
    updateAuthUI();
}

logoutBtn.addEventListener("click", () => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showToast("Đã đăng xuất.", "info");
    fetchAndRenderAccounts();
});

// ================= SKELETON LOADING =================

function renderSkeleton(count = 8) {
    grid.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const card = document.createElement("div");
        card.className = "skeleton-card";
        card.innerHTML = `
            <div class="skeleton-shimmer skeleton-img"></div>
            <div class="skeleton-shimmer skeleton-line"></div>
            <div class="skeleton-shimmer skeleton-line short"></div>
        `;
        grid.appendChild(card);
    }
    pagination.innerHTML = "";
}

// ================= TẢI & HIỂN THỊ DANH SÁCH ACC =================

async function fetchAndRenderAccounts() {
    renderSkeleton();
    try {
        const params = new URLSearchParams({
            q: currentQuery,
            page: String(currentPage),
            limit: String(ITEMS_PER_PAGE),
            sort: currentSort,
        });
        const data = await apiFetch(`/accounts?${params.toString()}`);
        totalPages = data.totalPages || 1;
        
        //Tính tổng số acc
        const totalCountEl = document.getElementById("total-accounts-count");
        if (totalCountEl) {
            totalCountEl.textContent = data.total || 0;
        }

        renderGrid(data.items || [], data.total || 0);
        renderPagination();
    } catch (err) {
        renderErrorState(err.message);
    }
}

function renderErrorState(message) {
    grid.innerHTML = "";
    const el = document.createElement("div");
    el.className = "empty-state";
    el.innerHTML = `<span class="empty-icon">⚠️</span>Không tải được dữ liệu: ${message}
        <div class="empty-action"><button class="btn btn-secondary" onclick="fetchAndRenderAccounts()">Thử lại</button></div>`;
    grid.appendChild(el);
    pagination.innerHTML = "";
}

function renderGrid(items, total) {
    grid.innerHTML = "";

    if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.innerHTML = currentQuery
            ? `<span class="empty-icon">🔍</span>Không tìm thấy acc hoặc skin nào khớp với “<strong>${currentQuery}</strong>”`
            : `<span class="empty-icon">📚</span>Chưa có acc nào trong shop.`;
        grid.appendChild(empty);
        return;
    }

    const isAdmin = currentUser && currentUser.role === "admin";
    const keyword = currentQuery.toLowerCase();

    // Lưu lại danh sách hiện tại để modal "Xem" tra cứu thông tin đầy đủ
    currentItems = items;

    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = item.sold ? "card sold" : "card";

        let skinTagsHTML = "";
        const skinCount = item.skins ? item.skins.length : 0;
        if (skinCount > 0) {
            const displaySkins = item.skins.slice(0, 3);
            const hasMore = skinCount > 3;
            skinTagsHTML = `<div class="skin-list">
                ${displaySkins.map((skin) => {
                    const isMatched = keyword && skin.toLowerCase().includes(keyword);
                    return `<span class="skin-tag ${isMatched ? "highlight" : ""}">${escapeHTML(skin)}</span>`;
                }).join("")}
                ${hasMore ? `<span class="skin-more">...</span>` : ""}
            </div>`;
        }

        const infoTextHTML = item.info ? `<p class="card-info-text">${escapeHTML(item.info)}</p>` : "";
        const adminNoteHTML = item.adminNote ? `<span class="admin-note-tag"> ${escapeHTML(item.adminNote)}</span>` : "";
        const soldBadgeHTML = item.sold ? `<span class="sold-card-badge">Đã bán</span>` : "";
        const viewBtnHTML = `<button class="btn-card view-btn" onclick="openImageModal('${item.id}')">👁️ Xem</button>`;
        const adminActionsHTML = isAdmin
            ? `<button class="btn-card edit-btn" onclick="openEditModal('${item.id}')">Sửa</button>
               <button class="btn-card delete-btn" onclick="deleteStory('${item.id}')">Xóa</button>`
            : "";

        card.innerHTML = `
            <div class="card-image-wrap" onclick="openImageModal('${item.id}')">
                ${soldBadgeHTML}
                <img loading="lazy" src="${escapeAttr(item.image)}" alt="${escapeAttr(formatPrice(item.price))}">
                ${adminNoteHTML}
                <div class="page-edge"></div>
            </div>
            <div class="info">
                <div class="price">${formatPrice(item.price)}</div>
                ${infoTextHTML}
                ${skinTagsHTML}
                <div class="card-actions">
                    ${viewBtnHTML}
                    ${adminActionsHTML}
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}
function escapeAttr(str) {
    return (str ?? "").replace(/'/g, "&#39;").replace(/"/g, "&quot;");
}

function formatPrice(price) {
    const num = Number(price) || 0;
    return num.toLocaleString("vi-VN") + " đ";
}

function renderPagination() {
    pagination.innerHTML = "";
    if (totalPages <= 1) return;

    const makeBtn = (label, page, opts = {}) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (opts.active) btn.classList.add("active");
        if (opts.disabled) btn.disabled = true;
        btn.onclick = () => {
            if (opts.disabled) return;
            currentPage = page;
            fetchAndRenderAccounts();
        };
        return btn;
    };

    pagination.appendChild(makeBtn("‹", currentPage - 1, { disabled: currentPage <= 1 }));
    for (let i = 1; i <= totalPages; i++) {
        pagination.appendChild(makeBtn(String(i), i, { active: i === currentPage }));
    }
    pagination.appendChild(makeBtn("›", currentPage + 1, { disabled: currentPage >= totalPages }));
}

if (search) {
    search.addEventListener("input", () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentQuery = search.value.trim();
            currentPage = 1;
            fetchAndRenderAccounts();
        }, SEARCH_DEBOUNCE_MS);
    });
}

// ================= GỢI Ý TÌM KIẾM =================

if (search && searchHints) {
    search.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (value.length > 0) {
            searchHints.classList.add('hidden'); // Gõ chữ -> Ẩn hint
        } else {
            searchHints.classList.remove('hidden'); // Xóa hết -> Hiện hint
        }
    });

    search.addEventListener('focus', () => {
        if (search.value.trim() === '') {
            searchHints.classList.remove('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            searchHints.classList.add('hidden');
        }
    });
}

// ================= MENU TÍNH NĂNG ADMIN (gộp 1 nút) =================

if (userDisplay && adminMenuDropdown) {
    userDisplay.addEventListener("click", (e) => {
        if (currentUser && currentUser.role === "admin") {
            e.stopPropagation();
            adminMenuDropdown.classList.toggle("hidden");
        }
    });

    document.addEventListener("click", (e) => {
        if (userInfo && !userInfo.contains(e.target)) {
            adminMenuDropdown.classList.add("hidden");
        }
    });

    // Đóng menu sau khi chọn 1 mục bất kỳ
    adminMenuDropdown.querySelectorAll(".admin-menu-item").forEach((item) => {
        item.addEventListener("click", () => {
            adminMenuDropdown.classList.add("hidden");
        });
    });
}

// ================= CRUD ACC (chỉ admin) =================

if (addAccBtn) {
    addAccBtn.addEventListener("click", () => {
        editingId = null;
        modalFormTitle.textContent = "Thêm Tài Khoản Mới";
        accForm.reset();
        crudError.textContent = "";
        openCrudModal();
    });
}

function parseCsv(text) {
    const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] || "";
    const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (char === '"') {
            if (inQuotes && text[index + 1] === '"') {
                value += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            row.push(value.trim());
            value = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && text[index + 1] === "\n") index += 1;
            row.push(value.trim());
            if (row.some(Boolean)) rows.push(row);
            row = [];
            value = "";
        } else {
            value += char;
        }
    }
    row.push(value.trim());
    if (row.some(Boolean)) rows.push(row);
    if (inQuotes) throw new Error("File CSV có dấu nháy kép chưa được đóng.");
    return rows;
}

function resetCsvImport(clearFile = true) {
    pendingBulkAccounts = [];
    if (clearFile && csvImportFile) csvImportFile.value = "";
    if (csvImportError) csvImportError.textContent = "";
    if (csvImportPreview) {
        csvImportPreview.classList.add("hidden");
        csvImportPreview.innerHTML = "";
    }
    if (csvImportSubmitBtn) csvImportSubmitBtn.disabled = true;
}

function closeCsvImportModal() {
    if (csvImportModal) csvImportModal.classList.remove("active");
    resetCsvImport();
}

function showCsvPreview(items, skipped = 0) {
    const previewRows = items.slice(0, 5).map((item) => `
        <tr>
            <td>${formatPrice(item.price)}</td>
            <td>${escapeHTML(item.info || "-")}</td>
            <td>${escapeHTML(item.adminNote || "-")}</td>
            <td>${item.skins.length}</td>
        </tr>
    `).join("");
    csvImportPreview.innerHTML = `
        <p><strong>Đã đọc ${items.length} acc hợp lệ.</strong>${skipped ? ` Đã bỏ qua ${skipped} dòng có URL ảnh trùng.` : ""} Tài khoản và mật khẩu game sẽ được mã hóa khi lưu.</p>
        <div class="csv-preview-table-wrap">
            <table class="csv-preview-table">
                <thead><tr><th>Giá</th><th>Thông tin</th><th>Tag lưu ý</th><th>Skins</th></tr></thead>
                <tbody>${previewRows}</tbody>
            </table>
        </div>
        ${items.length > 5 ? `<p class="csv-preview-more">…và ${items.length - 5} acc khác.</p>` : ""}
    `;
    csvImportPreview.classList.remove("hidden");
}

if (importAccBtn) {
    importAccBtn.addEventListener("click", () => {
        resetCsvImport();
        csvImportModal.classList.add("active");
    });
}

if (csvImportFile) {
    csvImportFile.addEventListener("change", async () => {
        resetCsvImport(false);
        const file = csvImportFile.files[0];
        if (!file) return;
        try {
            const rows = parseCsv(await file.text());
            const firstValue = (rows[0]?.[0] || "").toLowerCase();
            const dataRows = ["tag lưu ý", "tag luu y", "tag", "note"].includes(firstValue) ? rows.slice(1) : rows;
            if (!dataRows.length || dataRows.length > 200) throw new Error("File cần có từ 1 đến 200 dòng acc.");

            const errors = [];
            const imageUrls = new Set();
            const items = dataRows.map((row, index) => {
                const line = index + (dataRows === rows ? 1 : 2);
                if (row.length < 7) errors.push(`Dòng ${line}: cần đủ 7 cột.`);
                const price = Number((row[1] || "").replace(/[.\s]/g, ""));
                if (!Number.isFinite(price) || price < 0) errors.push(`Dòng ${line}: giá không hợp lệ.`);
                const image = (row[2] || "").trim();
                let normalizedImage = "";
                try {
                    const url = new URL(image);
                    if (url.protocol !== "https:") throw new Error("not https");
                    url.hash = "";
                    normalizedImage = url.toString();
                } catch {
                    errors.push(`Dòng ${line}: URL ảnh phải là https:// hợp lệ.`);
                }
                const duplicateImage = normalizedImage && imageUrls.has(normalizedImage);
                imageUrls.add(normalizedImage);
                if (!(row[5] || "").trim() || !(row[6] || "").trim()) errors.push(`Dòng ${line}: thiếu tài khoản hoặc mật khẩu game.`);
                if ((row[0] || "").trim().length > 160) errors.push(`Dòng ${line}: tag lưu ý tối đa 160 ký tự.`);
                return {
                    price,
                    image: normalizedImage,
                    info: (row[3] || "").trim(),
                    skins: (row[4] || "").split("|").map((skin) => skin.trim()).filter(Boolean),
                    adminNote: (row[0] || "").trim(),
                    gameUsername: (row[5] || "").trim(),
                    gamePassword: (row[6] || "").trim(),
                    duplicateImage,
                };
            });
            if (errors.length) throw new Error(errors.slice(0, 5).join(" "));
            const uniqueItems = items.filter((item) => !item.duplicateImage);
            pendingBulkAccounts = uniqueItems;
            showCsvPreview(uniqueItems, items.length - uniqueItems.length);
            csvImportSubmitBtn.disabled = uniqueItems.length === 0;
        } catch (err) {
            csvImportError.textContent = err.message;
        }
    });
}

if (csvImportSubmitBtn) {
    csvImportSubmitBtn.addEventListener("click", async () => {
        if (!pendingBulkAccounts.length) return;
        setButtonLoading(csvImportSubmitBtn, true);
        try {
            const data = await apiFetch("/accounts/bulk", {
                method: "POST",
                body: JSON.stringify({ items: pendingBulkAccounts }),
            });
            const skipped = data.skipped ? `, bỏ qua ${data.skipped} acc trùng ảnh` : "";
            showToast(`Đã thêm ${data.created} acc${skipped} và mã hóa thông tin đăng nhập.`, "success");
            closeCsvImportModal();
            fetchAndRenderAccounts();
        } catch (err) {
            const details = err.details?.length ? ` ${err.details.join(" ")}` : "";
            csvImportError.textContent = `${err.message}${details}`;
        } finally {
            setButtonLoading(csvImportSubmitBtn, false, "Nhập acc");
        }
    });
}

if (csvImportModalClose) csvImportModalClose.addEventListener("click", closeCsvImportModal);
if (csvImportCancelBtn) csvImportCancelBtn.addEventListener("click", closeCsvImportModal);

window.openEditModal = async function (id) {
    try {
        const data = await apiFetch(`/accounts/${id}`);
        editingId = id;
        modalFormTitle.textContent = "Chỉnh Sửa Tài Khoản";
        inputPrice.value = data.item.price;
        inputImage.value = data.item.image;
        inputInfo.value = data.item.info || "";
        inputSkins.value = data.item.skins ? data.item.skins.join("\n") : "";
        inputAdminNote.value = data.item.adminNote || "";
        inputGameUsername.value = data.item.gameUsername || "";
        inputGamePassword.value = data.item.gamePassword || "";
        crudError.textContent = "";
        openCrudModal();
    } catch (err) {
        showToast(err.message, "error");
    }
};

if (accForm) {
    accForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        crudError.textContent = "";

        const price = inputPrice.value;
        const image = inputImage.value.trim();
        const info = inputInfo.value.trim();
        const skins = inputSkins.value.split("\n").map((s) => s.trim()).filter(Boolean);
        const adminNote = inputAdminNote.value.trim();
        const gameUsername = inputGameUsername.value.trim();
        const gamePassword = inputGamePassword.value.trim();

        setButtonLoading(crudSubmitBtn, true);
        try {
            if (editingId !== null) {
                await apiFetch(`/accounts/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify({ price, image, info, skins, adminNote, gameUsername, gamePassword }),
                });
                showToast("Đã cập nhật acc.", "success");
            } else {
                await apiFetch("/accounts", {
                    method: "POST",
                    body: JSON.stringify({ price, image, info, skins, adminNote, gameUsername, gamePassword }),
                });
                showToast("Đã thêm acc mới.", "success");
            }
            closeCrudModal();
            fetchAndRenderAccounts();
        } catch (err) {
            crudError.textContent = err.message;
        } finally {
            setButtonLoading(crudSubmitBtn, false, "Lưu lại");
        }
    });
}

window.deleteStory = async function (id) {
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) return;
    try {
        await apiFetch(`/accounts/${id}`, { method: "DELETE" });
        showToast("Đã xóa acc.", "success");
        fetchAndRenderAccounts();
    } catch (err) {
        showToast(err.message, "error");
    }
};

// ================= MUA ACC =================

if (modalBuyBtn) {
    modalBuyBtn.addEventListener("click", async () => {
        // Chưa đăng nhập -> mở form đăng nhập trước
        if (!currentUser) {
            closeModal();
            switchAuthTab("login");
            loginModal.classList.add("active");
            showToast("Vui lòng đăng nhập để mua tài khoản.", "info");
            return;
        }

        const item = currentItems.find((i) => i.id === currentModalItemId);
        if (!item) return;

        if (!confirm(`Xác nhận mua acc với giá ${formatPrice(item.price)}?\nSố tiền sẽ được trừ ngay vào ví của bạn.`)) {
            return;
        }

        setButtonLoading(modalBuyBtn, true);
        try {
            const data = await apiFetch(`/accounts/${item.id}/purchase`, { method: "POST" });

            currentUser.balance = data.balance;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            updateAuthUI();

            showToast("🎉 Mua tài khoản thành công!", "success");
            closeModal();
            fetchAndRenderAccounts(); // acc vừa mua sẽ biến mất khỏi danh sách công khai
            openHistoryModal(); // chuyển sang lịch sử mua acc của người dùng
        } catch (err) {
            showToast(err.message, "error");
            if (err.message.includes("Số dư không đủ")) {
                closeModal();
                openWalletModal();
            }
        } finally {
            setButtonLoading(modalBuyBtn, false, "🛒 Mua tài khoản này");
        }
    });
}

// ================= VÍ TIỀN (Wallet) =================

async function openWalletModal() {
    if (!currentUser) {
        switchAuthTab("login");
        loginModal.classList.add("active");
        return;
    }
    walletModal.classList.add("active");
    if (walletBalanceAmount) walletBalanceAmount.textContent = formatPrice(currentUser.balance || 0);

    try {
        const data = await apiFetch("/wallet/me");
        currentUser.balance = data.balance;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        updateAuthUI();
        if (walletBalanceAmount) walletBalanceAmount.textContent = formatPrice(data.balance);
    } catch (err) {
        showToast(err.message, "error");
    }
}

function closeWalletModal() {
    walletModal.classList.remove("active");
}

if (walletBtn) walletBtn.addEventListener("click", openWalletModal);
if (walletModalClose) walletModalClose.addEventListener("click", closeWalletModal);

// ================= LỊCH SỬ MUA ACC =================

async function openHistoryModal() {
    if (!currentUser) return;
    closeWalletModal();
    historyModal.classList.add("active");
    historyList.innerHTML = `<div class="empty-state"><span class="spinner"></span>Đang tải...</div>`;

    try {
        const data = await apiFetch("/purchases/me");
        renderHistoryList(data.items || []);
    } catch (err) {
        historyList.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
    }
}

function renderHistoryList(items) {
    if (items.length === 0) {
        historyList.innerHTML = `<div class="empty-state"><span class="empty-icon">🧾</span>Bạn chưa mua tài khoản nào.</div>`;
        return;
    }

    historyList.innerHTML = items.map((p) => {
        const skinsHTML = (p.skins || []).map((s) => `<span class="skin-tag">${escapeHTML(s)}</span>`).join("");
        const purchasedDate = p.purchasedAt ? new Date(p.purchasedAt).toLocaleString("vi-VN") : "";
        return `
            <div class="history-item">
                <img src="${escapeAttr(p.image)}" alt="${escapeAttr(formatPrice(p.price))}">
                <div class="history-item-info">
                    <div class="price">${formatPrice(p.price)}</div>
                    ${p.info ? `<p class="card-info-text">${escapeHTML(p.info)}</p>` : ""}
                    <div class="skin-list">${skinsHTML}</div>
                    <span class="history-date">Mua lúc: ${purchasedDate}</span>
                </div>
                ${p.gameUsername && p.gamePassword ? `
                    <aside class="purchase-login-details" aria-label="Thông tin đăng nhập acc đã mua">
                        <strong>🔐 Thông tin đăng nhập</strong>
                        <div class="purchase-login-row">
                            <span>Tài khoản</span>
                            <code>${escapeHTML(p.gameUsername)}</code>
                            <button type="button" class="copy-credential-btn" data-copy-value="${escapeAttr(p.gameUsername)}" data-copy-label="tài khoản">⧉ Sao chép</button>
                        </div>
                        <div class="purchase-login-row">
                            <span>Mật khẩu</span>
                            <code>${escapeHTML(p.gamePassword)}</code>
                            <button type="button" class="copy-credential-btn" data-copy-value="${escapeAttr(p.gamePassword)}" data-copy-label="mật khẩu">⧉ Sao chép</button>
                        </div>
                    </aside>
                ` : ""}
            </div>
        `;
    }).join("");
}

async function copyCredential(value, label) {
    try {
        await navigator.clipboard.writeText(value);
    } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
    }
    showToast(`Đã sao chép ${label}.`, "success");
}

if (historyList) {
    historyList.addEventListener("click", (event) => {
        const button = event.target.closest(".copy-credential-btn");
        if (button) copyCredential(button.dataset.copyValue, button.dataset.copyLabel);
    });
}

if (openHistoryBtn) openHistoryBtn.addEventListener("click", openHistoryModal);
if (historyModalClose) historyModalClose.addEventListener("click", () => historyModal.classList.remove("active"));

// ================= QUẢN LÝ NGƯỜI DÙNG (chỉ admin) =================

if (manageUsersBtn) {
    manageUsersBtn.addEventListener("click", () => {
        usersModal.classList.add("active");
        loadUsers();
    });
}

async function loadUsers() {
    usersError.textContent = "";
    usersTableBody.innerHTML = `<tr><td colspan="4"><span class="spinner"></span>Đang tải...</td></tr>`;
    try {
        const data = await apiFetch("/users");
        renderUsersTable(data.items);
    } catch (err) {
        usersError.textContent = err.message;
        usersTableBody.innerHTML = "";
    }
}

function renderUsersTable(users) {
    usersTableBody.innerHTML = "";
    users.forEach((u) => {
        const tr = document.createElement("tr");
        const createdDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "-";
        const isSelf = currentUser && currentUser.id === u.id;

        tr.innerHTML = `
            <td>${escapeHTML(u.username)}${isSelf ? " <em>(bạn)</em>" : ""}</td>
            <td>
                <div class="balance-form-group">
                    <input type="number" 
                           class="balance-input" 
                           data-id="${u.id}" 
                           value="${u.balance || 0}" 
                           min="0" 
                           step="10000" 
                           placeholder="0">
                    <button class="save-balance-btn" data-id="${u.id}">Lưu</button>
                </div>
            </td>
            <td>
                <select class="role-select" data-id="${u.id}" ${isSelf ? "disabled" : ""}>
                    <option value="user" ${u.role === "user" ? "selected" : ""}>User</option>
                    <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
                </select>
            </td>
            <td>${createdDate}</td>
            <td class="actions">
                <button class="btn btn-outline btn-small" data-action="delete" data-id="${u.id}" ${isSelf ? "disabled" : ""}>Xóa</button>
            </td>
        `;
        usersTableBody.appendChild(tr);
    });

    // Sự kiện lưu số dư giữ nguyên
    usersTableBody.querySelectorAll(".save-balance-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.dataset.id;
            const input = usersTableBody.querySelector(`.balance-input[data-id="${id}"]`);
            const newBalance = Number(input.value);

            if (isNaN(newBalance) || newBalance < 0) {
                showToast("Số dư nhập vào không hợp lệ.", "error");
                return;
            }

            try {
                const res = await apiFetch(`/users/${id}/balance`, {
                    method: "PUT",
                    body: JSON.stringify({ balance: newBalance }),
                });

                if (currentUser && currentUser.id === id) {
                    currentUser.balance = newBalance;
                    localStorage.setItem("currentUser", JSON.stringify(currentUser));
                    updateAuthUI();
                }

                showToast("Cập nhật số dư thành công!", "success");
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    });

    usersTableBody.querySelectorAll(".role-select").forEach((sel) => {
        sel.addEventListener("change", async (e) => {
            const id = e.target.dataset.id;
            try {
                await apiFetch(`/users/${id}`, {
                    method: "PUT",
                    body: JSON.stringify({ role: e.target.value }),
                });
                showToast("Đã cập nhật vai trò.", "success");
            } catch (err) {
                showToast(err.message, "error");
                loadUsers();
            }
        });
    });

    usersTableBody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.dataset.id;
            if (!confirm("Xóa người dùng này?")) return;
            try {
                await apiFetch(`/users/${id}`, { method: "DELETE" });
                showToast("Đã xóa người dùng.", "success");
                loadUsers();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    });
}

if (addUserForm) {
    addUserForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        usersError.textContent = "";
        const username = document.getElementById("new-user-username").value.trim();
        const password = document.getElementById("new-user-password").value;
        const role = document.getElementById("new-user-role").value;

        try {
            await apiFetch("/users", {
                method: "POST",
                body: JSON.stringify({ username, password, role }),
            });
            showToast("Đã thêm người dùng mới.", "success");
            addUserForm.reset();
            loadUsers();
        } catch (err) {
            usersError.textContent = err.message;
        }
    });
}

if (usersModalClose) {
    usersModalClose.addEventListener("click", () => usersModal.classList.remove("active"));
}

// ================= MODALS & SỰ KIỆN CHUNG =================

function openCrudModal() { crudModal.classList.add("active"); }
function closeCrudModal() { crudModal.classList.remove("active"); }

if (crudModalClose) crudModalClose.addEventListener("click", closeCrudModal);
if (cancelFormBtn) cancelFormBtn.addEventListener("click", closeCrudModal);

window.openImageModal = function (id) {
    const item = currentItems.find((i) => i.id === id);
    if (!item || !modalImg || !modal) return;

    currentModalItemId = id;

    modalImg.src = item.image;
    modalImg.alt = formatPrice(item.price);

    if (modalInfoTitle) modalInfoTitle.textContent = formatPrice(item.price);
    if (modalInfoText) modalInfoText.textContent = item.info || "";
    if (modalInfoNote) {
        modalInfoNote.textContent = item.adminNote ? ` ${item.adminNote}` : "";
        modalInfoNote.classList.toggle("hidden", !item.adminNote);
    }
    if (modalInfoSkins) {
        modalInfoSkins.innerHTML = (item.skins || [])
            .map((skin) => `<span class="skin-tag">${escapeHTML(skin)}</span>`)
            .join("");
    }

    // Hiện nút "Mua" hoặc nhãn "Đã bán" tuỳ trạng thái acc
    if (modalBuyBtn && modalSoldLabel) {
        if (item.sold) {
            modalBuyBtn.classList.add("hidden");
            modalSoldLabel.classList.remove("hidden");
        } else {
            modalBuyBtn.classList.remove("hidden");
            modalSoldLabel.classList.add("hidden");
        }
    }

    modal.classList.add("active");
};

if (modalClose) modalClose.addEventListener("click", closeModal);

window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
    if (e.target === crudModal) closeCrudModal();
    if (e.target === loginModal) closeLoginModal();
    if (e.target === usersModal) usersModal.classList.remove("active");
    if (e.target === csvImportModal) closeCsvImportModal();
    if (e.target === walletModal) closeWalletModal();
    if (e.target === historyModal) historyModal.classList.remove("active");
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeModal();
        closeCrudModal();
        closeLoginModal();
        usersModal.classList.remove("active");
        closeCsvImportModal();
        closeWalletModal();
        historyModal.classList.remove("active");
        if (searchHints) searchHints.classList.add("hidden");
        if (adminMenuDropdown) adminMenuDropdown.classList.add("hidden");
    }
});

function closeModal() {
    if (modal) modal.classList.remove("active");
}

// ================= KHỞI TẠO =================

updateAuthUI();
fetchAndRenderAccounts();
