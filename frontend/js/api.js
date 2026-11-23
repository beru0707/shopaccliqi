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
        if (err.name === "AbortError") throw err;
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

