// ================= MODALS & SỰ KIỆN CHUNG =================

function openCrudModal() { crudModal.classList.add("active"); }
function closeCrudModal() { crudModal.classList.remove("active"); }

if (crudModalClose) crudModalClose.addEventListener("click", closeCrudModal);
if (cancelFormBtn) cancelFormBtn.addEventListener("click", closeCrudModal);

function scrollToAuctionHistory() {
    if (!modalAuctionHistory || modalAuctionHistory.classList.contains("hidden")) return false;
    // Cuộn đúng khung modal, không làm trang phía sau bị nhảy.
    if (imageModalInner) {
        const targetTop = imageModalInner.scrollTop
            + modalAuctionHistory.getBoundingClientRect().top
            - imageModalInner.getBoundingClientRect().top - 12;
        imageModalInner.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    } else {
        modalAuctionHistory.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return true;
}

if (modalScrollHint) {
    modalScrollHint.addEventListener("click", async () => {
        // Khi người dùng bấm ngay sau khi mở modal, chờ API lịch sử trả về
        // thay vì nhầm trạng thái "đang tải" với "không có đấu giá".
        if (modalAuctionLoadPromise) await modalAuctionLoadPromise;
        if (!modalAuctionHistory || modalAuctionHistory.classList.contains("hidden")) {
            showToast("Tài khoản này chưa có lịch sử đấu giá.", "info");
            return;
        }
        scrollToAuctionHistory();
    });
}

window.openImageModal = function (id, options = {}) {
    const item = currentItems.find((i) => i.id === id);
    if (!item || !modalImg || !modal) return;

    currentModalItemId = id;
    stopAuctionPolling();

    // Hiện ngay ảnh nhẹ (thường đã có trong cache từ card), sau đó tải ảnh gốc
    // ở nền để người dùng không phải nhìn modal trống khi ảnh lớn đang tải.
    const thumbnailUrl = cloudinaryThumbnailUrl(item.image);
    modalImg.src = thumbnailUrl;
    modalImg.alt = formatPrice(item.price);

    if (thumbnailUrl !== item.image) {
        const originalImage = new Image();
        originalImage.onload = () => {
            // Không ghi đè ảnh nếu người dùng đã mở một acc khác trong lúc chờ.
            if (currentModalItemId === id) {
                modalImg.src = item.image;
            }
        };
        originalImage.src = item.image;
    }

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
    if (modalAuctionHistory) {
        modalAuctionHistory.classList.add("hidden");
        modalAuctionHistory.innerHTML = "";
        if (modalBidArea) {
            modalBidArea.classList.add("hidden");
            modalBidArea.innerHTML = "";
        }
        modalAuctionLoadPromise = apiFetch(`/auctions/${id}`).then(({ auction }) => {
            if (currentModalItemId !== id) return;
            renderAuctionHistory(auction);
            updateAuctionBidArea(auction, true);
            void updateBalanceAfterWinningAuction(auction);
            if (auction.active) scheduleAuctionPolling(id, auction.endsAt);
            if (options.focusAuction) {
                requestAnimationFrame(scrollToAuctionHistory);
            }
            return true;
        }).catch(() => false);
    }
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
    if (e.target === changePasswordModal) closeChangePasswordModal();
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
        closeChangePasswordModal();
    }
});

function closeModal() {
    stopAuctionPolling();
    if (modal) modal.classList.remove("active");
}

// ================= KHỞI TẠO =================

updateAuthUI();
if (grid && pagination) fetchAndRenderAccounts();

// Khi quay lại tab đang mở modal đấu giá, cập nhật ngay vùng giá và lượt đấu giá.
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentModalItemId && modal?.classList.contains("active")) {
        stopAuctionPolling();
        pollAuction(currentModalItemId);
    }
});
