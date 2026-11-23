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
    accountsRequestController?.abort();
    const requestController = new AbortController();
    accountsRequestController = requestController;
    const requestId = ++accountsRequestId;
    renderSkeleton();

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("page", currentPage);
    window.history.pushState({}, "", newUrl);

    try {
        const params = new URLSearchParams({
            q: currentQuery,
            page: String(currentPage),
            limit: String(ITEMS_PER_PAGE),
            sort: currentSort,
            fastSearch: currentQuery ? "1" : "0",
        });
        const data = await apiFetch(`/accounts?${params.toString()}`, { signal: requestController.signal });
        if (requestId !== accountsRequestId) return;
        uncountedAccountSearch = data.total === null;
        accountSearchHasMore = Boolean(data.hasMore);
        totalPages = data.totalPages || 1;
        
        //Tính tổng số acc
        const totalCountEl = document.getElementById("total-accounts-count");
        if (totalCountEl) {
            const minimumCount = (currentPage - 1) * ITEMS_PER_PAGE + (data.items || []).length + (data.hasMore ? 1 : 0);
            totalCountEl.textContent = data.total ?? (data.hasMore ? `≥${minimumCount}` : minimumCount);
        }

        renderGrid(data.items || [], data.total, data.hasMore);
        renderPagination();
        
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
        if (err.name === "AbortError" || requestId !== accountsRequestId) return;
        renderErrorState(err.message);
    } finally {
        if (requestId === accountsRequestId) accountsRequestController = null;
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

let currentChipFilter = "all";
let rawGridItems = [];

function setupFilterChips() {
    const chipContainer = document.getElementById("filter-chips-container");
    if (chipContainer && !chipContainer.dataset.wired) {
        chipContainer.dataset.wired = "true";
        chipContainer.querySelectorAll(".chip").forEach((btn) => {
            btn.addEventListener("click", () => {
                const filter = btn.getAttribute("data-filter");
                applyChipFilter(filter);
            });
        });
    }
}

function applyChipFilter(filter) {
    currentChipFilter = filter;
    document.querySelectorAll(".chip").forEach((c) => {
        c.classList.toggle("active", c.getAttribute("data-filter") === filter);
    });

    let filtered = rawGridItems;
    if (filter === "available") {
        filtered = rawGridItems.filter(item => !item.sold);
    } else if (filter === "sold") {
        filtered = rawGridItems.filter(item => item.sold);
    } else if (filter === "high-rank") {
        filtered = rawGridItems.filter(item => {
            const txt = ((item.info || "") + " " + (item.adminNote || "")).toLowerCase();
            return txt.includes("cao thủ") || txt.includes("chiến tướng") || txt.includes("tinh anh");
        });
    } else if (filter === "ttt") {
        filtered = rawGridItems.filter(item => {
            const txt = ((item.adminNote || "") + " " + (item.info || "")).toUpperCase();
            return txt.includes("TTT") || txt.includes("TRẮNG");
        });
    } else if (filter === "cheap") {
        filtered = rawGridItems.filter(item => Number(item.price) <= 20000);
    }

    renderCardsList(filtered);
}

function renderGrid(items, total, hasMore = false) {
    rawGridItems = items;
    setupFilterChips();

    const totalCountEl = document.getElementById("total-accounts-count");
    if (totalCountEl) {
        const minimumCount = (currentPage - 1) * ITEMS_PER_PAGE + items.length + (hasMore ? 1 : 0);
        totalCountEl.textContent = total ?? (hasMore ? `≥${minimumCount}` : minimumCount);
    }

    applyChipFilter(currentChipFilter);
}

function renderCardsList(items) {
    grid.innerHTML = "";

    const visibleCountEl = document.getElementById("visible-accounts-count");
    if (visibleCountEl) visibleCountEl.textContent = items.length;

    if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.innerHTML = currentQuery
            ? `<span class="empty-icon">🔍</span>Không tìm thấy acc hoặc skin nào khớp với “<strong>${currentQuery}</strong>”`
            : `<span class="empty-icon">📚</span>Không có tài khoản nào phù hợp bộ lọc này.`;
        grid.appendChild(empty);
        return;
    }

    const isAdmin = currentUser && currentUser.role === "admin";
    const keyword = currentQuery.toLowerCase();
    currentItems = items;

    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = item.sold ? "card sold" : "card";
        card.onclick = () => openImageModal(item.id);

        // Xử lý tiêu đề chính và tags skin
        let mainTitle = item.info || "";
        let tagList = item.skins ? [...item.skins] : [];
        if (!mainTitle && tagList.length > 0) {
            mainTitle = tagList.shift();
        }
        if (!mainTitle) mainTitle = "Tài khoản game";

        const tagsHTML = tagList.length > 0 ? `<div class="tags">
            ${tagList.slice(0, 2).map((tag, idx) => {
                const isMatched = keyword && tag.toLowerCase().includes(keyword);
                const tagClass = idx === 0 ? "tag tag-primary" : "tag tag-secondary";
                return `<span class="${tagClass} ${isMatched ? "highlight" : ""}">${escapeHTML(tag)}</span>`;
            }).join("")}
            ${tagList.length > 2 ? `<span class="skin-more">+${tagList.length - 2}</span>` : ""}
        </div>` : "";

        // Trạng thái badge
        const auctionActive = !item.sold && item.auctionStartsAt && item.auctionEndsAt
            && new Date(item.auctionStartsAt) <= new Date() && new Date(item.auctionEndsAt) > new Date();

        const statusBadgeHTML = item.sold 
            ? `<span class="badge-status badge-sold">✓ ĐÃ BÁN</span>`
            : (auctionActive ? `<span class="badge-status auction-card-badge">🔨 ĐẤU GIÁ</span>` : "");

        const noteText = "TTTKLK";
        const noteBadgeHTML = `<span class="badge-status badge-note">${noteText}</span>`;

        // Thông tin rank & tướng/skin dưới ảnh
        const rankMatch = (item.info || "").match(/(Cao Thủ|Chiến Tướng|Tinh Anh|Kim Cương|Bạch Kim)[^•,\n]*/i);
        const rankText = rankMatch ? `🏆 ${rankMatch[0].trim()}` : "";
        const metaOverlayHTML = rankText
            ? `<div class="meta-overlay"><span>${escapeHTML(rankText)}</span></div>`
            : "";

        // Action buttons
        const actionBtnsHTML = isAdmin
            ? `<div class="action-buttons" onclick="event.stopPropagation()">
                <button type="button" class="btn-sm btn-edit" onclick="openEditModal('${item.id}')">✏️ Sửa</button>
                <button type="button" class="btn-sm btn-delete" onclick="deleteStory('${item.id}')">🗑️ Xóa</button>
               </div>`
            : (!item.sold 
                ? `<div class="action-buttons" onclick="event.stopPropagation()">
                    <button type="button" class="btn-sm btn-buy" onclick="openImageModal('${item.id}')">🛒 Mua ngay</button>
                   </div>`
                : `<div class="action-buttons"><span class="badge-sold-pill">Đã bán</span></div>`);

        card.innerHTML = `
            <div class="card-media">
                ${statusBadgeHTML}
                ${noteBadgeHTML}
                <img loading="lazy" decoding="async" src="${escapeAttr(cloudinaryThumbnailUrl(item.image))}" alt="${escapeAttr(formatPrice(item.price))}">
                <div class="media-gradient"></div>
                ${metaOverlayHTML}
            </div>
            <div class="card-body">
                <div class="title-group">
                    <h3 class="card-title ${item.sold ? 'sold-title' : ''}">${escapeHTML(mainTitle)}</h3>
                    ${tagsHTML}
                </div>
                <div class="card-bottom">
                    <div class="price-box">
                        <span class="price-label">${item.sold ? 'Đã thanh toán' : 'Giá niêm yết'}</span>
                        <span class="price-value ${item.sold ? 'price-sold' : ''}">${formatPrice(item.price)}</span>
                    </div>
                    ${actionBtnsHTML}
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

// Database giữ URL gốc; chỉ card lấy phiên bản nhẹ do Cloudinary tạo động.
function cloudinaryThumbnailUrl(imageUrl, width = 640) {
    if (typeof imageUrl !== "string") return "";
    const marker = "/image/upload/";
    if (!imageUrl.includes("res.cloudinary.com") || !imageUrl.includes(marker)) return imageUrl;
    return imageUrl.replace(marker, `${marker}f_auto,q_auto,w_${width},c_limit,dpr_auto/`);
}

function formatPrice(price) {
    const num = Number(price) || 0;
    return num.toLocaleString("vi-VN") + " đ";
}

function renderPagination() {
    pagination.innerHTML = "";
    if (uncountedAccountSearch) {
        if (currentPage === 1 && !accountSearchHasMore) return;
        const prevBtn = document.createElement("button");
        prevBtn.textContent = "‹ Prev";
        prevBtn.disabled = currentPage <= 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                fetchAndRenderAccounts();
            }
        };
        const label = document.createElement("span");
        label.textContent = `Trang ${currentPage}`;
        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next ›";
        nextBtn.disabled = !accountSearchHasMore;
        nextBtn.onclick = () => {
            if (accountSearchHasMore) {
                currentPage++;
                fetchAndRenderAccounts();
            }
        };
        pagination.append(prevBtn, label, nextBtn);
        return;
    }
    if (totalPages <= 1) return;

    // 1. Nút Prev
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "‹ Prev";
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            fetchAndRenderAccounts();
        }
    };
    pagination.appendChild(prevBtn);

    // 2. Khung trượt chứa tất cả số trang
    const wrapper = document.createElement("div");
    wrapper.className = "page-numbers-wrapper";

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = String(i);
        if (i === currentPage) {
            btn.classList.add("active");
            
            setTimeout(() => {
                const wrapperRect = wrapper.getBoundingClientRect();
                const btnRect = btn.getBoundingClientRect();

                const btnLeftInWrapper = wrapper.scrollLeft + (btnRect.left - wrapperRect.left);
                const targetLeft = btnLeftInWrapper - (wrapper.clientWidth / 2) + (btn.clientWidth / 2);

                wrapper.scrollTo({
                        left: Math.max(0, targetLeft),
                        behavior: "smooth"
                    });
                }, 50);
            }

        btn.onclick = () => {
            currentPage = i;
            fetchAndRenderAccounts();
        };

        wrapper.appendChild(btn);
    }

    pagination.appendChild(wrapper);

    // 3. Nút Next
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next ›";
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchAndRenderAccounts();
        }
    };
    pagination.appendChild(nextBtn);
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

window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    currentPage = parseInt(params.get("page"), 10) || 1;
    fetchAndRenderAccounts();
});

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

//sort acc price
const sortDropdowns = [];

function syncSortDropdowns(value) {
    sortDropdowns.forEach(({ trigger, options }) => {
        const selected = options.find((option) => option.dataset.value === value);
        if (selected) trigger.querySelector(".sort-trigger-label").textContent = selected.textContent;
        options.forEach((option) => {
            option.setAttribute("aria-selected", String(option.dataset.value === value));
        });
    });
}

function enhanceSortSelect(select) {
    if (!select || select.dataset.customized === "true") return;
    select.dataset.customized = "true";

    const wrapper = select.parentElement;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "sort-trigger";
    trigger.setAttribute("aria-label", "Sắp xếp tài khoản");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `${select.id}-menu`);
    trigger.innerHTML = '<span class="sort-trigger-label"></span><span class="sort-trigger-arrow" aria-hidden="true"></span>';

    const menu = document.createElement("div");
    menu.id = `${select.id}-menu`;
    menu.className = "sort-menu hidden";
    menu.setAttribute("role", "listbox");
    menu.tabIndex = -1;

    const options = Array.from(select.options).map((nativeOption) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "sort-option";
        option.textContent = nativeOption.textContent;
        option.dataset.value = nativeOption.value;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(nativeOption.value === select.value));
        option.addEventListener("click", () => {
            select.value = nativeOption.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            menu.classList.add("hidden");
            trigger.setAttribute("aria-expanded", "false");
            trigger.focus();
        });
        menu.appendChild(option);
        return option;
    });

    select.classList.add("sort-native-select");
    wrapper.classList.add("sort-box-custom");
    wrapper.append(trigger, menu);
    trigger.addEventListener("click", () => {
        const isOpening = menu.classList.contains("hidden");
        document.querySelectorAll(".sort-menu").forEach((otherMenu) => otherMenu.classList.add("hidden"));
        document.querySelectorAll(".sort-trigger[aria-expanded='true']").forEach((otherTrigger) => otherTrigger.setAttribute("aria-expanded", "false"));
        menu.classList.toggle("hidden", !isOpening);
        trigger.setAttribute("aria-expanded", String(isOpening));
    });
    trigger.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            menu.classList.remove("hidden");
            trigger.setAttribute("aria-expanded", "true");
            (options.find((option) => option.getAttribute("aria-selected") === "true") || options[0])?.focus();
        }
    });
    menu.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            menu.classList.add("hidden");
            trigger.setAttribute("aria-expanded", "false");
            trigger.focus();
        }
    });
    document.addEventListener("click", (event) => {
        if (!wrapper.contains(event.target)) {
            menu.classList.add("hidden");
            trigger.setAttribute("aria-expanded", "false");
        }
    });
    sortDropdowns.push({ trigger, options });
    syncSortDropdowns(select.value);
}

function handleSortChange(e) {
    const selectedValue = e.target.value;
    
    // Đồng bộ giá trị giữa 2 thẻ select PC & Mobile
    if (sortSelect) sortSelect.value = selectedValue;
    if (sortSelectMobile) sortSelectMobile.value = selectedValue;
    syncSortDropdowns(selectedValue);

    currentSort = selectedValue;
    currentPage = 1;
    fetchAndRenderAccounts();
}

if (sortSelect) {
    sortSelect.addEventListener("change", handleSortChange);
}
if (sortSelectMobile) {
    sortSelectMobile.addEventListener("change", handleSortChange);
}
enhanceSortSelect(sortSelect);
enhanceSortSelect(sortSelectMobile);

