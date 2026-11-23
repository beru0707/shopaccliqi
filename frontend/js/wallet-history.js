// ================= VÍ TIỀN (Wallet) =================

async function openWalletModal() {
    if (!currentUser) {
        goToLoginPage();
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

async function openHistoryModal(page = 1) {
    if (!currentUser) return;
    const pageSize = 8;
    closeWalletModal();
    historyModal.classList.add("active");
    historyList.innerHTML = `<div class="empty-state"><span class="spinner"></span>Đang tải...</div>`;

    try {
        const data = await apiFetch(`/purchases/me?page=${page}&limit=${pageSize}`);
        renderHistoryList(data.items || []);
        renderHistoryPagination(historyPagination, page, data.hasMore, openHistoryModal);
    } catch (err) {
        historyList.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
    }
}

function renderHistoryPagination(container, page, hasMore, onPage) {
    if (!container) return;
    container.innerHTML = "";
    container.hidden = page === 1 && !hasMore;
    if (container.hidden) return;

    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "← Trước";
    previous.disabled = page <= 1;
    previous.addEventListener("click", () => onPage(page - 1));

    const label = document.createElement("span");
    label.textContent = `Trang ${page}`;

    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Sau →";
    next.disabled = !hasMore;
    next.addEventListener("click", () => onPage(page + 1));

    container.append(previous, label, next);
}

function renderHistoryList(items) {
    if (items.length === 0) {
        historyList.innerHTML = `<div class="empty-state"><span class="empty-icon">🧾</span>Bạn chưa mua tài khoản nào.</div>`;
        return;
    }

    historyList.innerHTML = items.map((p) => {
        const purchasedDate = p.purchasedAt ? new Date(p.purchasedAt).toLocaleString("vi-VN") : "";
        return `
            <div class="history-item">
                <button type="button" class="history-image-button" data-preview-image="${escapeAttr(p.image)}" aria-label="Phóng to ảnh acc">
                    <img loading="lazy" decoding="async" src="${escapeAttr(cloudinaryThumbnailUrl(p.image, 480))}" alt="${escapeAttr(formatPrice(p.price))}">
                </button>
                <div class="history-item-info">
                    <div class="price">${formatPrice(p.price)}</div>
                    ${p.info ? `<p class="card-info-text">${escapeHTML(p.info)}</p>` : ""}
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
        const previewButton = event.target.closest(".history-image-button");
        if (previewButton) return openHistoryImage(previewButton.dataset.previewImage);
        const button = event.target.closest(".copy-credential-btn");
        if (button) copyCredential(button.dataset.copyValue, button.dataset.copyLabel);
    });
}

function openHistoryImage(imageUrl) {
    if (!imageUrl) return;
    let lightbox = document.getElementById("history-image-lightbox");
    if (!lightbox) {
        lightbox = document.createElement("div");
        lightbox.id = "history-image-lightbox";
        lightbox.className = "history-image-lightbox";
        lightbox.innerHTML = '<button type="button" class="history-image-close" aria-label="Đóng ảnh phóng to">&times;</button><img alt="Ảnh acc phóng to">';
        lightbox.addEventListener("click", (event) => { if (event.target === lightbox || event.target.closest(".history-image-close")) lightbox.classList.remove("active"); });
        document.body.appendChild(lightbox);
    }
    lightbox.querySelector("img").src = imageUrl;
    lightbox.classList.add("active");
}

if (openHistoryBtn) openHistoryBtn.addEventListener("click", openHistoryModal);
if (historyModalClose) historyModalClose.addEventListener("click", () => historyModal.classList.remove("active"));

