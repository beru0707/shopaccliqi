const ITEMS_PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 250;

const urlParams = new URLSearchParams(window.location.search);
let currentPage = parseInt(urlParams.get("page"), 10) || 1;
let currentQuery = "";
let currentSort = "";
let totalPages = 1;
let accountSearchHasMore = false;
let uncountedAccountSearch = false;
let editingId = null;
let searchDebounceTimer = null;
let accountsRequestController = null;
let accountsRequestId = 0;
let currentItems = []; // danh sách acc đang hiển thị, dùng để modal "Xem" tra cứu thông tin
let isPlacingBid = false;

// Token + user hiện tại lấy từ localStorage
let authToken = localStorage.getItem("authToken") || null;
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

// ===== DOM chính =====
const grid = document.getElementById("grid");
const pagination = document.getElementById("pagination");
const search = document.getElementById("search");
const searchHints = document.getElementById("search-hints");
const sortSelect = document.getElementById("sort-select");
const sortSelectMobile = document.getElementById("sort-select-mobile");
const toastContainer = document.getElementById("toast-container");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mainNav = document.getElementById("main-nav");
const siteHeader = document.querySelector(".site-header");
const mainSearchBar = document.querySelector(".site-header .main-bar");

if (siteHeader) {
    const updateHeaderHeight = () => {
        const height = siteHeader.offsetHeight;
        if (height > 0) {
            document.documentElement.style.setProperty("--header-height", `${height}px`);
        }
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight, { passive: true });
    window.addEventListener("scroll", updateHeaderHeight, { passive: true });
}

if (siteHeader && mainSearchBar) {
    const mobileSearchViewport = window.matchMedia("(max-width: 768px)");
    let previousScrollY = window.scrollY;

    const updateSearchVisibility = () => {
        if (!mobileSearchViewport.matches) {
            siteHeader.classList.remove("search-row-hidden");
            previousScrollY = window.scrollY;
            return;
        }

        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - previousScrollY;

        if (currentScrollY <= 0) {
            siteHeader.classList.remove("search-row-hidden");
        } else if (currentScrollY > 0 && scrollDelta > 0) {
            siteHeader.classList.add("search-row-hidden");
        }

        previousScrollY = currentScrollY;
    };

    window.addEventListener("scroll", updateSearchVisibility, { passive: true });
    window.addEventListener("resize", updateSearchVisibility, { passive: true });
}

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
const changePasswordBtn = document.getElementById("change-password-btn");
const profileLogoutBtn = document.getElementById("profile-logout-btn");

// Dùng chung cho mọi trang có header tài khoản.
const changePasswordModal = document.createElement("div");
changePasswordModal.id = "change-password-modal";
changePasswordModal.className = "modal";
changePasswordModal.setAttribute("role", "dialog");
changePasswordModal.setAttribute("aria-hidden", "true");
changePasswordModal.innerHTML = `
    <div class="modal-card change-password-card">
        <button type="button" id="change-password-close" class="modal-close" aria-label="Đóng">&times;</button>
        <h2>Đổi mật khẩu</h2>
        <form id="change-password-form">
            <div class="form-group"><label for="current-password">Mật khẩu hiện tại *</label><input id="current-password" type="password" required autocomplete="current-password" placeholder="Nhập mật khẩu cũ"></div>
            <div class="form-group"><label for="new-password">Mật khẩu mới *</label><input id="new-password" type="password" required minlength="6" autocomplete="new-password" placeholder="Tối thiểu 6 ký tự"></div>
            <div class="form-group"><label for="new-password-confirm">Nhập lại mật khẩu mới *</label><input id="new-password-confirm" type="password" required minlength="6" autocomplete="new-password" placeholder="Tối thiểu 6 ký tự"></div>
            <div id="change-password-error" class="form-error"></div>
            <div class="form-actions"><button type="submit" id="change-password-submit" class="btn btn-primary" style="width: 100%;">Cập nhật mật khẩu</button></div>
        </form>
    </div>`;
document.body.appendChild(changePasswordModal);
const changePasswordForm = document.getElementById("change-password-form");
const changePasswordError = document.getElementById("change-password-error");
const changePasswordSubmit = document.getElementById("change-password-submit");

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
const modalAuctionHistory = document.getElementById("modal-auction-history");
const modalBidArea = document.getElementById("modal-bid-area");
const modalScrollHint = document.getElementById("modal-scroll-hint");
const imageModalInner = document.getElementById("image-modal-inner");
let currentModalItemId = null; // acc đang được xem trong modal, dùng khi bấm "Mua"
let modalAuctionLoadPromise = null;
let auctionPollingTimer = null;
let auctionPollInFlight = false;
const settledAuctionNotifications = new Set();

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
const historyPagination = document.getElementById("history-pagination");

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
const inputAuctionStartPrice = document.getElementById("auction-start-price");
const inputAuctionStartsAt = document.getElementById("auction-starts-at");
const inputAuctionEndsAt = document.getElementById("auction-ends-at");

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

