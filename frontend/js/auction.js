// ================= MUA ACC =================

if (modalBuyBtn) {
    modalBuyBtn.addEventListener("click", async () => {
        await window.buyAccountById(currentModalItemId);
    });
}

window.buyAccountById = async function (id) {
        // Chưa đăng nhập -> mở form đăng nhập trước
        if (!currentUser) {
            closeModal();
            goToLoginPage();
            showToast("Vui lòng đăng nhập để mua tài khoản.", "info");
            return;
        }

        const item = currentItems.find((i) => i.id === id);
        if (!item) return;

        if (!confirm(`Xác nhận mua acc với giá ${formatPrice(item.price)}?\nSố tiền sẽ được trừ ngay vào ví của bạn.`)) {
            return;
        }

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
        }
};

window.openAuction = async function (id) {
    // Nút đấu giá luôn mở phần xem chi tiết trước để người dùng xem ảnh lớn,
    // giá hiện tại và lịch sử đấu giá trong cùng một luồng.
    window.openImageModal(id, { focusAuction: true });
};

function renderAuctionHistory(auction) {
    if (!modalAuctionHistory) return;
    const maskName = (name) => `${String(name || "").slice(0, 3)}${"*".repeat(Math.max(3, String(name || "").length - 3))}`;
    const currentPrice = auction.highestBid || auction.startPrice;
    modalAuctionHistory.innerHTML = `<strong>🔨 Lịch sử đấu giá</strong><div class="auction-meta">Giá hiện tại: <b>${formatPrice(currentPrice)}</b> · Kết thúc: ${new Date(auction.endsAt).toLocaleString("vi-VN")}</div>${auction.bids.length ? auction.bids.map((bid) => `<div class="auction-bid"><span>${escapeHTML(maskName(bid.username))}</span><b>${formatPrice(bid.amount)}</b><time>${new Date(bid.createdAt).toLocaleString("vi-VN")}</time></div>`).join("") : "<p>Chưa có lượt đấu giá.</p>"}`;
    modalAuctionHistory.classList.remove("hidden");
}

function updateAuctionBidArea(auction, reset = false) {
    if (!modalBidArea) return;
    const currentPrice = auction.highestBid || auction.startPrice;
    const minimum = currentPrice + (auction.highestBid ? 100 : 0);
    const bidInput = document.getElementById("modal-bid-input");
    if (!auction.active) {
        modalBidArea.classList.add("hidden");
        return;
    }
    if (reset || !bidInput) {
        modalBidArea.innerHTML = `<label for="modal-bid-input">Đặt giá của bạn (tối thiểu ${formatPrice(minimum)})</label><div class="modal-bid-form"><input id="modal-bid-input" type="number" min="${minimum}" step="100" value="${minimum}"><button id="modal-bid-submit" type="button" class="btn btn-primary" onclick="placeBidFromModal('${auction.accountId}')">Đặt giá</button></div><p id="modal-bid-status" class="modal-bid-status" aria-live="polite"></p>`;
    } else {
        bidInput.min = String(minimum);
        const bidLabel = modalBidArea.querySelector("label");
        if (bidLabel) bidLabel.textContent = `Đặt giá của bạn (tối thiểu ${formatPrice(minimum)})`;
    }
    modalBidArea.classList.remove("hidden");
}

async function updateBalanceAfterWinningAuction(auction) {
    const ended = new Date(auction.endsAt).getTime() <= Date.now();
    if (!currentUser || auction.active || !ended || settledAuctionNotifications.has(auction.accountId)) return;
    settledAuctionNotifications.add(auction.accountId);
    try {
        const purchases = await apiFetch("/purchases/me");
        if (!purchases.items?.some((purchase) => purchase.accountId === auction.accountId)) return;
        const previousBalance = Number(currentUser.balance || 0);
        const wallet = await apiFetch("/wallet/me");
        currentUser.balance = wallet.balance;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        updateAuthUI();
        if (walletBalanceAmount) walletBalanceAmount.textContent = formatPrice(wallet.balance);
        const deducted = Math.max(0, previousBalance - Number(wallet.balance || 0));
        showToast(deducted ? `Bạn đã thắng đấu giá. Đã trừ ${formatPrice(deducted)} khỏi số dư.` : "Bạn đã thắng đấu giá. Số dư đã được cập nhật.", "success");
    } catch (_) {
        settledAuctionNotifications.delete(auction.accountId);
        // Không ảnh hưởng dữ liệu đấu giá; số dư sẽ được đồng bộ khi người dùng mở ví.
    }
}

function stopAuctionPolling() {
    if (auctionPollingTimer) clearTimeout(auctionPollingTimer);
    auctionPollingTimer = null;
}

function scheduleAuctionPolling(accountId, endsAt) {
    stopAuctionPolling();
    if (!modal?.classList.contains("active") || currentModalItemId !== accountId) return;
    const remainingMs = new Date(endsAt).getTime() - Date.now();
    const delay = remainingMs <= 30_000 ? 5_000 : Math.min(60_000, Math.max(1_000, remainingMs - 30_000));
    auctionPollingTimer = setTimeout(() => pollAuction(accountId), delay);
}

async function pollAuction(accountId) {
    if (auctionPollInFlight || document.visibilityState !== "visible" || currentModalItemId !== accountId || !modal?.classList.contains("active")) return;
    auctionPollInFlight = true;
    try {
        const { auction } = await apiFetch(`/auctions/${accountId}`);
        if (currentModalItemId !== accountId) return;
        renderAuctionHistory(auction);
        updateAuctionBidArea(auction);
        void updateBalanceAfterWinningAuction(auction);
        if (auction.active) scheduleAuctionPolling(accountId, auction.endsAt);
    } catch (_) {
        // Lỗi mạng tạm thời: thử lại theo nhịp bình thường, không làm gián đoạn modal.
        scheduleAuctionPolling(accountId, new Date(Date.now() + 60_000).toISOString());
    } finally {
        auctionPollInFlight = false;
    }
}

window.placeBidFromModal = async function (id) {
    if (!currentUser) { goToLoginPage(); return; }
    if (isPlacingBid) return;
    const bidButton = document.getElementById("modal-bid-submit");
    const bidInput = document.getElementById("modal-bid-input");
    const bidStatus = document.getElementById("modal-bid-status");
    isPlacingBid = true;
    if (bidButton) {
        bidButton.disabled = true;
        bidButton.innerHTML = '<span class="spinner"></span> Đang đặt giá...';
    }
    if (bidInput) bidInput.disabled = true;
    if (bidStatus) bidStatus.textContent = "Đang gửi giá của bạn, vui lòng không bấm lại.";
    try {
        const { auction } = await apiFetch(`/auctions/${id}`);
        if (!auction.active) return showToast("Đấu giá chưa bắt đầu hoặc đã kết thúc.", "error");
        const minimum = (auction.highestBid || auction.startPrice) + (auction.highestBid ? 100 : 0);
        const amount = Number(bidInput?.value);
        if (!Number.isSafeInteger(amount)) return;
        await apiFetch(`/auctions/${id}/bids`, { method: "POST", body: JSON.stringify({ amount }) });
        showToast("Đã đặt giá đấu thành công.", "success");
        fetchAndRenderAccounts();
        window.openImageModal(id, { focusAuction: true });
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        isPlacingBid = false;
        if (bidButton?.isConnected) {
            bidButton.disabled = false;
            bidButton.textContent = "Đặt giá";
        }
        if (bidInput?.isConnected) bidInput.disabled = false;
        if (bidStatus?.isConnected) bidStatus.textContent = "";
    }
};

