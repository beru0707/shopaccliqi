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
        inputAuctionStartPrice.value = data.item.auctionStartPrice || "";
        inputAuctionStartsAt.value = data.item.auctionStartsAt ? new Date(data.item.auctionStartsAt).toISOString().slice(0, 16) : "";
        inputAuctionEndsAt.value = data.item.auctionEndsAt ? new Date(data.item.auctionEndsAt).toISOString().slice(0, 16) : "";
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
        const auctionStartPrice = inputAuctionStartPrice.value || null;
        // Giá account cũng là giá mua chốt, không cần nhập một lần nữa.
        const auctionBuyNowPrice = price || null;
        const auctionStartsAt = inputAuctionStartsAt.value ? new Date(inputAuctionStartsAt.value).toISOString() : null;
        const auctionEndsAt = inputAuctionEndsAt.value ? new Date(inputAuctionEndsAt.value).toISOString() : null;

        setButtonLoading(crudSubmitBtn, true);
        try {
            if (editingId !== null) {
                await apiFetch(`/accounts/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify({ price, image, info, skins, adminNote, gameUsername, gamePassword, auctionStartPrice, auctionBuyNowPrice, auctionStartsAt, auctionEndsAt }),
                });
                showToast("Đã cập nhật acc.", "success");
            } else {
                await apiFetch("/accounts", {
                    method: "POST",
                    body: JSON.stringify({ price, image, info, skins, adminNote, gameUsername, gamePassword, auctionStartPrice, auctionBuyNowPrice, auctionStartsAt, auctionEndsAt }),
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

