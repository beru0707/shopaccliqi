// ================= AUTH: LOGIN / REGISTER / LOGOUT =================

// Cập nhật giao diện khi đăng nhập/đăng xuất
function updateAuthUI() {
    const authActions = document.getElementById("auth-actions");
    const userProfileTop = document.getElementById("user-profile-top");
    
    if (currentUser) {
        loginBtn.classList.add("hidden");
        if (authActions) authActions.classList.add("hidden");
        if (userProfileTop) userProfileTop.classList.remove("hidden");

        const isAdmin = currentUser.role === "admin";
        userDisplay.innerHTML = `${escapeHTML(currentUser.username)} ${isAdmin ? '<span class="admin-badge-tag">ADMIN</span>' : ''}`;

        const avatarInitial = document.querySelector("#user-profile-top .user-avatar-initial");
        if (avatarInitial && currentUser.username) {
            avatarInitial.textContent = currentUser.username.charAt(0).toUpperCase();
        }

        if (walletBalanceDisplay) {
            walletBalanceDisplay.textContent = `🪙 ${formatPrice(currentUser.balance || 0)}`;
        }
        if (adminMenuDropdown) {
            adminMenuDropdown.querySelectorAll(".admin-only-menu-item").forEach((item) => {
                item.classList.toggle("hidden", !isAdmin);
            });
        }
    } else {
        loginBtn.classList.remove("hidden");
        if (authActions) authActions.classList.remove("hidden");
        if (userProfileTop) userProfileTop.classList.add("hidden");
        if (adminMenuDropdown) adminMenuDropdown.classList.add("hidden");
    }
}

// Bấm vào ô tên - số dư để mở menu tài khoản; admin có thêm chức năng quản trị.
const userProfileTop = document.getElementById("user-profile-top");
if (userProfileTop && adminMenuDropdown) {
    userProfileTop.addEventListener("click", (e) => {
        if (currentUser && !e.target.closest(".profile-menu-item")) {
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
    if (!tabLogin || !tabRegister || !loginForm || !registerForm) return;
    const isLogin = tab === "login";
    tabLogin.classList.toggle("active", isLogin);
    tabRegister.classList.toggle("active", !isLogin);
    loginForm.classList.toggle("hidden", !isLogin);
    registerForm.classList.toggle("hidden", isLogin);
    loginError.textContent = "";
    registerError.textContent = "";
}

if (tabLogin) tabLogin.addEventListener("click", () => switchAuthTab("login"));
if (tabRegister) tabRegister.addEventListener("click", () => switchAuthTab("register"));

function goToLoginPage() {
    window.location.href = window.location.pathname.includes("/frontend/") ? "dangnhap.html" : "frontend/dangnhap.html";
}

if (loginBtn) loginBtn.addEventListener("click", goToLoginPage);

if (loginModalClose) loginModalClose.addEventListener("click", closeLoginModal);

function closeLoginModal() {
    if (!loginModal || !loginForm || !registerForm) return;
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

if (loginForm) loginForm.addEventListener("submit", async (e) => {
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
        if (grid && pagination) fetchAndRenderAccounts();
    } catch (err) {
        loginError.textContent = err.message;
    } finally {
        setButtonLoading(loginSubmitBtn, false, "Đăng nhập");
    }
});

if (registerForm) registerForm.addEventListener("submit", async (e) => {
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
        if (grid && pagination) fetchAndRenderAccounts();
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

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showToast("Đã đăng xuất.", "info");
    if (grid && pagination) fetchAndRenderAccounts();
}

if (logoutBtn) logoutBtn.addEventListener("click", logout);
if (profileLogoutBtn) profileLogoutBtn.addEventListener("click", logout);

function closeChangePasswordModal() {
    changePasswordModal.classList.remove("active");
    changePasswordForm.reset();
    changePasswordError.textContent = "";
}

if (changePasswordBtn) changePasswordBtn.addEventListener("click", () => {
    if (!currentUser) return;
    if (adminMenuDropdown) adminMenuDropdown.classList.add("hidden");
    changePasswordModal.classList.add("active");
    document.getElementById("current-password").focus();
});

document.getElementById("change-password-close").addEventListener("click", closeChangePasswordModal);
changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    changePasswordError.textContent = "";
    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("new-password-confirm").value;
    if (newPassword !== confirmPassword) {
        changePasswordError.textContent = "Mật khẩu mới nhập lại không khớp.";
        return;
    }
    setButtonLoading(changePasswordSubmit, true);
    try {
        const data = await apiFetch("/auth/change-password", {
            method: "POST",
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        closeChangePasswordModal();
        showToast(data.message || "Đổi mật khẩu thành công.", "success");
    } catch (err) {
        changePasswordError.textContent = err.message;
    } finally {
        setButtonLoading(changePasswordSubmit, false, "Cập nhật mật khẩu");
    }
});

