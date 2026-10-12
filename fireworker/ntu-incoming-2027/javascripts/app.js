/* =============================================================================
   NTU OIA 來校訪問研究生申請系統：共用行為
   - 語系：?lang= → localStorage → en（不依瀏覽器語言）。切換時不重新載入，表單內容與捲動位置保留。
   - 標記方式：
       data-i18n="key"                    以字串取代 textContent
       data-i18n-vars='{"n":3}'           佔位符的值；可用 "config:xxx"、"t:key"、"date:YYYY-MM-DD"，或 {"en":..,"zh-Hant":..}
       data-i18n-attr="placeholder:key;aria-label:key"
       data-bi-en / data-bi-zh            後端提供的雙語資料 { en, zhHant }，中文缺漏時顯示英文
       .cms > [lang]                      後台可編輯的雙語內容區塊
       time[data-format]                  正文日期，依語系格式化
   ========================================================================== */
(function () {
    "use strict";

    var CONFIG = {
        // Footer 與 Need help 共用的聯絡信箱（已確認使用 intstudent@ntu.edu.tw）
        contactEmail: "intstudent@ntu.edu.tw",
        defaultLang: "en",
        storageKey: "oia-lang"
    };

    var DICT = window.OIA_I18N || { "en": {}, "zh-Hant": {} };
    var IS_DEV = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

    var $ = function (selector, root) { return (root || document).querySelector(selector); };
    var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

    // ---------------------------------------------------------------------
    // 語系
    // ---------------------------------------------------------------------
    function normalizeLang(value) {
        if (!value) return null;
        value = String(value).toLowerCase();
        if (value === "en") return "en";
        if (value.indexOf("zh") === 0) return "zh-Hant";
        return null;
    }

    function storageGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function storageSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* 無痕模式等情況略過 */ }
    }

    var paramLang = normalizeLang(new URLSearchParams(location.search).get("lang"));
    var lang = paramLang || normalizeLang(storageGet(CONFIG.storageKey)) || CONFIG.defaultLang;
    if (paramLang) storageSet(CONFIG.storageKey, paramLang);

    function t(key, vars) {
        var table = DICT[lang] || {};
        var value = table[key];
        if (value == null) {
            if (IS_DEV) console.warn("[i18n] 缺少 " + lang + " 字串：" + key);
            value = DICT.en[key];
        }
        if (value == null) return key;
        return value.replace(/\{(\w+)\}/g, function (match, name) {
            return vars && vars[name] != null ? resolveVar(vars[name]) : match;
        });
    }

    function resolveVar(value) {
        if (value && typeof value === "object") {
            return value[lang] != null && value[lang] !== "" ? value[lang] : (value.en || "");
        }
        if (typeof value === "string") {
            if (value.indexOf("config:") === 0) return CONFIG[value.slice(7)] || "";
            if (value.indexOf("t:") === 0) return t(value.slice(2));
            if (value.indexOf("date:") === 0) return formatDate(value.slice(5));
        }
        return value;
    }

    // 正文日期：英文 17 Apr 1998；中文 1998 年 4 月 17 日。表格與系統時間維持 YYYY-MM-DD，不經過這裡。
    function parseISO(iso) {
        var parts = String(iso).split("-").map(Number);
        return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    }

    function formatDate(iso) {
        var date = parseISO(iso);
        if (isNaN(date)) return iso;
        if (lang === "zh-Hant") {
            return date.getFullYear() + " 年 " + (date.getMonth() + 1) + " 月 " + date.getDate() + " 日";
        }
        return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
    }

    function formatRange(fromIso, toIso) {
        var from = parseISO(fromIso);
        var to = parseISO(toIso);
        if (lang === "zh-Hant") return formatDate(fromIso) + " – " + formatDate(toIso);
        var fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
        return fmt.formatRange ? fmt.formatRange(from, to) : fmt.format(from) + " – " + fmt.format(to);
    }

    function daysBetween(fromIso, toIso) {
        return Math.round((parseISO(toIso) - parseISO(fromIso)) / 864e5) + 1;
    }

    function todayISO() {
        var d = new Date();
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    function nowStamp() {
        var d = new Date();
        return todayISO() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function readVars(el) {
        if (!el.dataset.i18nVars) return null;
        try { return JSON.parse(el.dataset.i18nVars); } catch (e) { return null; }
    }

    // 套用語系到整頁或指定範圍
    function apply(root) {
        root = root || document;

        $$("[data-i18n]", root).forEach(function (el) {
            el.textContent = t(el.dataset.i18n, readVars(el));
        });

        $$("[data-i18n-attr]", root).forEach(function (el) {
            el.dataset.i18nAttr.split(";").forEach(function (pair) {
                var index = pair.indexOf(":");
                if (index < 0) return;
                el.setAttribute(pair.slice(0, index).trim(), t(pair.slice(index + 1).trim(), readVars(el)));
            });
        });

        $$("[data-bi-en]", root).forEach(function (el) {
            var zh = el.dataset.biZh;
            el.textContent = lang === "zh-Hant" && zh ? zh : el.dataset.biEn;
        });

        $$(".cms", root).forEach(function (block) {
            var current = $(":scope > [lang=\"" + lang + "\"]", block);
            var fallback = $(":scope > [lang=\"en\"]", block);
            var shown = current && current.textContent.trim() ? current : fallback;
            $$(":scope > [lang]", block).forEach(function (child) {
                child.classList.toggle("is-shown", child === shown);
            });
        });

        $$("time[data-format]", root).forEach(function (el) {
            var iso = el.getAttribute("datetime");
            if (el.dataset.format === "range") {
                var text = formatRange(iso, el.dataset.end);
                if (el.dataset.days != null) text += " · " + t("common.days", { n: daysBetween(iso, el.dataset.end) });
                el.textContent = text;
            } else {
                el.textContent = formatDate(iso);
            }
        });

        $$("[data-config]", root).forEach(function (el) {
            var value = CONFIG[el.dataset.config];
            el.textContent = value;
            if (el.tagName === "A") el.href = "mailto:" + value;
        });
    }

    function setLang(next) {
        next = normalizeLang(next) || CONFIG.defaultLang;
        lang = next;
        storageSet(CONFIG.storageKey, next);

        // 網址帶有 ?lang= 時同步更新，避免重新整理後跳回舊語系
        var url = new URL(location.href);
        if (url.searchParams.has("lang")) {
            url.searchParams.set("lang", next);
            history.replaceState(null, "", url);
        }
        render();
    }

    function render() {
        document.documentElement.lang = lang;
        apply(document);

        $$("[data-set-lang]").forEach(function (btn) {
            btn.setAttribute("aria-pressed", String(btn.dataset.setLang === lang));
        });

        var titleKey = document.body.dataset.titleKey;
        if (titleKey) document.title = t(titleKey) + " · " + t("header.system");

        document.dispatchEvent(new CustomEvent("oia:langchange", { detail: { lang: lang } }));
    }

    function checkDictionaries() {
        if (!IS_DEV) return;
        var en = Object.keys(DICT.en);
        var zh = Object.keys(DICT["zh-Hant"]);
        var missingZh = en.filter(function (key) { return !(key in DICT["zh-Hant"]); });
        var missingEn = zh.filter(function (key) { return !(key in DICT.en); });
        if (missingZh.length) console.warn("[i18n] zh-Hant.json 缺少 key：", missingZh);
        if (missingEn.length) console.warn("[i18n] en.json 缺少 key：", missingEn);
    }

    // ---------------------------------------------------------------------
    // Toast
    // ---------------------------------------------------------------------
    var toastEl;
    var toastTimer;
    var toastState = null;

    function toast(key, vars) {
        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.className = "toast";
            toastEl.setAttribute("role", "status");
            toastEl.setAttribute("aria-live", "polite");
            document.body.appendChild(toastEl);
        }
        toastState = { key: key, vars: vars };
        toastEl.textContent = t(key, vars);
        toastEl.classList.add("is-shown");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.classList.remove("is-shown");
            toastState = null;
        }, 2800);
    }

    document.addEventListener("oia:langchange", function () {
        if (toastEl && toastState) toastEl.textContent = t(toastState.key, toastState.vars);
    });

    // ---------------------------------------------------------------------
    // 欄位錯誤（訊息用 data-i18n，切換語系時自動換成對應語言）
    // ---------------------------------------------------------------------
    function fieldOf(input) {
        return input.closest("[data-field]") || input.closest(".field");
    }

    function setError(input, key, vars) {
        var field = fieldOf(input);
        if (!field) return;
        var id = (input.id || input.name) + "-error";
        var message = document.getElementById(id);
        if (!message) {
            message = document.createElement("p");
            message.className = "error";
            message.id = id;
            field.appendChild(message);
        }
        message.dataset.i18n = key;
        if (vars) message.dataset.i18nVars = JSON.stringify(vars);
        message.textContent = t(key, vars);

        input.setAttribute("aria-invalid", "true");
        var described = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
        if (described.indexOf(id) < 0) described.push(id);
        input.setAttribute("aria-describedby", described.join(" "));
    }

    function clearError(input) {
        var id = (input.id || input.name) + "-error";
        var message = document.getElementById(id);
        if (message) message.remove();
        input.removeAttribute("aria-invalid");
        var described = (input.getAttribute("aria-describedby") || "").split(" ").filter(function (item) {
            return item && item !== id;
        });
        if (described.length) input.setAttribute("aria-describedby", described.join(" "));
        else input.removeAttribute("aria-describedby");
    }

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var BLOCKED_EMAIL_RE = /(\.cn|@qq\.com|@126\.com|@163\.com)$/i;

    // ---------------------------------------------------------------------
    // Header：語系切換、使用者選單
    // ---------------------------------------------------------------------
    function initHeader() {
        $$("[data-set-lang]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                setLang(btn.dataset.setLang);
            });
        });

        $$("[data-user-menu]").forEach(function (menu) {
            var button = $(".user-menu__btn", menu);
            var dropdown = $(".user-menu__dropdown", menu);
            function close() {
                dropdown.hidden = true;
                button.setAttribute("aria-expanded", "false");
            }
            button.addEventListener("click", function (event) {
                event.stopPropagation();
                dropdown.hidden = !dropdown.hidden;
                button.setAttribute("aria-expanded", String(!dropdown.hidden));
            });
            document.addEventListener("click", function (event) {
                if (!menu.contains(event.target)) close();
            });
            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && !dropdown.hidden) {
                    close();
                    button.focus();
                }
            });
        });
    }

    // ---------------------------------------------------------------------
    // 步驟條
    // ---------------------------------------------------------------------
    function initSteps() {
        var current = Number(document.body.dataset.step);
        if (!current) return;
        var isPrc = document.body.dataset.prc === "true";
        var currentKey = "";

        $$("[data-step-item]").forEach(function (item) {
            var n = Number(item.dataset.stepItem);
            var skipped = n === 2 && !isPrc;
            item.classList.toggle("is-current", n === current);
            item.classList.toggle("is-done", n < current);
            item.classList.toggle("is-skipped", skipped);
            if (n === current) {
                item.setAttribute("aria-current", "step");
                currentKey = $(".steps__title", item).dataset.i18n;
            }
        });

        var currentLabel = $("[data-steps-current]");
        var count = $("[data-steps-count]");
        if (currentLabel) currentLabel.dataset.i18n = currentKey;
        if (count) {
            count.dataset.i18n = "steps.compact";
            count.dataset.i18nVars = JSON.stringify({ n: current, total: 5 });
        }
        $$(".steps-compact__bar span").forEach(function (bar, index) {
            bar.classList.toggle("is-done", index + 1 < current);
            bar.classList.toggle("is-current", index + 1 === current);
        });
    }

    // ---------------------------------------------------------------------
    // Portal nav：目前頁面、顯示條件、手機下拉
    // ---------------------------------------------------------------------
    // 各狀態的申請階段（數字越大越後面），用來決定哪些項目可點
    var STAGES = { underReview: 1, supplement: 1, approved: 2, admitted: 3, enrolled: 4, departed: 5 };
    var NAV_RULES = {
        review: function () { return true; },
        supplement: function (status) { return status === "supplement"; },
        visa: function (status, stage) { return stage >= 2; },
        admission: function (status, stage) { return stage >= 3; },
        regDocs: function (status, stage) { return stage >= 3; },
        download: function (status, stage) { return stage >= 3; },
        enrollCert: function (status, stage) { return stage >= 4; },
        departure: function (status, stage) { return stage >= 4; },
        researchCert: function (status, stage) { return stage >= 5; }
    };

    function initPortalNav() {
        var nav = $("[data-portal-nav]");
        if (!nav) return;
        var page = document.body.dataset.page;
        var status = document.body.dataset.appStatus || "underReview";
        var stage = STAGES[status] || 1;
        var toggle = $("[data-portal-toggle]", nav);
        var panel = $("#portal-nav-panel");
        var currentLabel = $("[data-portal-current]", nav);

        $$("[data-nav]", nav).forEach(function (link) {
            var key = link.dataset.nav;
            var isCurrent = key === page;
            var rule = NAV_RULES[key];
            var enabled = isCurrent || !rule || rule(status, stage);

            if (isCurrent) {
                link.setAttribute("aria-current", "page");
                currentLabel.dataset.i18n = link.dataset.i18n;
            }
            if (!enabled) {
                link.setAttribute("aria-disabled", "true");
                link.dataset.href = link.getAttribute("href");
                link.removeAttribute("href");
                link.setAttribute("role", "link");
            }
        });

        toggle.addEventListener("click", function () {
            var open = !panel.classList.contains("is-open");
            panel.classList.toggle("is-open", open);
            toggle.setAttribute("aria-expanded", String(open));
        });
    }

    // ---------------------------------------------------------------------
    // On this page：目前區塊與填寫進度
    // ---------------------------------------------------------------------
    function sectionProgress(section) {
        var total = 0;
        var done = 0;
        var radios = {};

        $$("[required], [data-progress-required]", section).forEach(function (el) {
            if (el.disabled) return;
            if (el.type === "radio") {
                if (radios[el.name]) return;
                radios[el.name] = true;
                total += 1;
                if ($("input[name=\"" + el.name + "\"]:checked", section)) done += 1;
                return;
            }
            if (el.closest("[hidden]")) return;
            total += 1;
            if (el.type === "checkbox" ? el.checked : String(el.value).trim()) done += 1;
        });

        $$("[data-upload][data-required=\"true\"]", section).forEach(function (upload) {
            total += 1;
            if (upload.classList.contains("has-file")) done += 1;
        });

        return { total: total, done: done };
    }

    function updateToc() {
        $$("[data-toc] a[href^=\"#\"]").forEach(function (link) {
            var section = document.getElementById(link.getAttribute("href").slice(1));
            var dot = $(".dot", link);
            if (!section || !dot || dot.dataset.static != null) return;
            var progress = sectionProgress(section);
            dot.classList.toggle("is-done", progress.total > 0 && progress.done === progress.total);
        });
    }

    function initToc() {
        var toc = $("[data-toc]");
        if (!toc) return;
        var links = $$("a[href^=\"#\"]", toc);
        var sections = links.map(function (link) {
            return document.getElementById(link.getAttribute("href").slice(1));
        }).filter(Boolean);

        if ("IntersectionObserver" in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    links.forEach(function (link) {
                        var active = link.getAttribute("href") === "#" + entry.target.id;
                        link.classList.toggle("is-active", active);
                        if (active) link.setAttribute("aria-current", "true");
                        else link.removeAttribute("aria-current");
                    });
                });
            }, { rootMargin: "-30% 0px -60% 0px" });
            sections.forEach(function (section) { observer.observe(section); });
        }

        updateToc();
        document.addEventListener("input", updateToc);
        document.addEventListener("change", updateToc);
        document.addEventListener("oia:uploadchange", updateToc);
    }

    // ---------------------------------------------------------------------
    // 上傳列：選檔、拖放、移除；上傳完成即儲存
    // ---------------------------------------------------------------------
    var TYPE_KEYS = { "pdf": "common.fileTypes.pdf5", "pdf,jpg,png": "common.fileTypes.pdfJpgPng5" };

    function formatSize(bytes) {
        if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
        return (bytes / 1024 / 1024).toFixed(1) + " MB";
    }

    function updateUploadChip(upload) {
        var item = upload.closest("[data-doc-item]");
        var chip = item && $("[data-upload-chip]", item);
        if (!chip) return;
        var hasFile = upload.classList.contains("has-file");
        var required = upload.dataset.required === "true";
        var key = hasFile ? "status.uploaded" : required ? "common.required" : "common.optional";
        chip.dataset.i18n = key;
        chip.className = "chip " + (hasFile ? "chip--ok" : required ? "chip--act" : "chip--muted");
        chip.textContent = t(key);
    }

    function updateUploadCounters() {
        var uploads = $$("[data-upload][data-required=\"true\"]");
        var done = uploads.filter(function (upload) { return upload.classList.contains("has-file"); }).length;
        $$("[data-upload-count]").forEach(function (el) {
            el.dataset.i18nVars = JSON.stringify({ done: done, total: uploads.length });
            el.textContent = t(el.dataset.i18n, readVars(el));
        });
        $$("[data-upload-segments]").forEach(function (wrap) {
            wrap.innerHTML = "";
            uploads.forEach(function (upload, index) {
                var seg = document.createElement("span");
                if (index < done) seg.className = "is-on";
                wrap.appendChild(seg);
            });
        });
    }

    function initUploads() {
        $$("[data-upload]").forEach(function (upload) {
            var row = $("[data-upload-file]", upload);
            var zone = $("[data-upload-zone]", upload);
            var input = zone && $("input[type=\"file\"]", zone);
            var accept = (upload.dataset.accept || "pdf,jpg,png").split(",");
            var maxMb = Number(upload.dataset.max || 5);

            function showError(key, vars) {
                zone.classList.add("is-invalid");
                setError(input, key, vars);
            }

            function setFile(file) {
                var ext = (file.name.split(".").pop() || "").toLowerCase();
                var normalized = ext === "jpeg" ? "jpg" : ext;
                clearError(input);
                zone.classList.remove("is-invalid");
                if (accept.indexOf(normalized) < 0) return showError("validation.fileType");
                if (file.size > maxMb * 1024 * 1024) return showError("validation.fileSize", { max: maxMb + " MB" });

                $("[data-file-type]", row).textContent = normalized.toUpperCase();
                $("[data-file-name]", row).textContent = file.name;
                var meta = $("[data-file-meta]", row);
                meta.dataset.i18n = "common.fileMeta";
                meta.dataset.i18nVars = JSON.stringify({ size: formatSize(file.size), date: "date:" + todayISO() });
                meta.textContent = t("common.fileMeta", readVars(meta));
                row.hidden = false;
                zone.hidden = true;
                upload.classList.add("has-file");
                changed();
                toast("upload.uploaded");
            }

            function changed() {
                updateUploadChip(upload);
                updateUploadCounters();
                upload.dispatchEvent(new CustomEvent("oia:uploadchange", { bubbles: true }));
            }

            if (row && !row.hidden) upload.classList.add("has-file");

            if (input) {
                input.addEventListener("change", function () {
                    if (input.files && input.files[0]) setFile(input.files[0]);
                    input.value = "";
                });
                ["dragenter", "dragover"].forEach(function (type) {
                    zone.addEventListener(type, function (event) {
                        event.preventDefault();
                        zone.classList.add("is-dragover");
                    });
                });
                ["dragleave", "drop"].forEach(function (type) {
                    zone.addEventListener(type, function (event) {
                        event.preventDefault();
                        zone.classList.remove("is-dragover");
                    });
                });
                zone.addEventListener("drop", function (event) {
                    var file = event.dataTransfer && event.dataTransfer.files[0];
                    if (file) setFile(file);
                });
            }

            $$("[data-upload-remove]", upload).forEach(function (btn) {
                btn.addEventListener("click", function () {
                    row.hidden = true;
                    zone.hidden = false;
                    upload.classList.remove("has-file");
                    changed();
                    toast("upload.removed");
                    input.focus();
                });
            });

            updateUploadChip(upload);
        });
        updateUploadCounters();
    }

    // ---------------------------------------------------------------------
    // 對話框：開啟時鎖定焦點，Esc 關閉
    // ---------------------------------------------------------------------
    var FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type=\"hidden\"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";
    var openDialog = null;

    function dialogOpen(id, opener) {
        var backdrop = document.getElementById(id);
        if (!backdrop) return;
        backdrop.hidden = false;
        document.body.classList.add("has-dialog");
        openDialog = { el: backdrop, opener: opener || document.activeElement };
        var first = $("[autofocus]", backdrop) || $$(FOCUSABLE, $(".dialog", backdrop))[0];
        if (first) first.focus();
        backdrop.dispatchEvent(new CustomEvent("oia:dialogopen", { detail: { opener: opener } }));
    }

    function dialogClose() {
        if (!openDialog) return;
        var current = openDialog;
        openDialog = null;
        current.el.hidden = true;
        document.body.classList.remove("has-dialog");
        if (current.opener && current.opener.focus) current.opener.focus();
    }

    function initDialogs() {
        document.addEventListener("click", function (event) {
            var opener = event.target.closest("[data-dialog-open]");
            if (opener) {
                event.preventDefault();
                dialogOpen(opener.dataset.dialogOpen, opener);
                return;
            }
            if (event.target.closest("[data-dialog-close]")) {
                dialogClose();
                return;
            }
            if (openDialog && event.target === openDialog.el) dialogClose();
        });

        document.addEventListener("keydown", function (event) {
            if (!openDialog) return;
            if (event.key === "Escape") {
                event.preventDefault();
                dialogClose();
                return;
            }
            if (event.key !== "Tab") return;
            var items = $$(FOCUSABLE, $(".dialog", openDialog.el)).filter(function (el) {
                return el.offsetParent !== null;
            });
            if (!items.length) return;
            var first = items[0];
            var last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    // ---------------------------------------------------------------------
    // 勾選後才啟用按鈕
    // ---------------------------------------------------------------------
    function initCheckGates() {
        $$("[data-enable-with]").forEach(function (btn) {
            var box = document.getElementById(btn.dataset.enableWith);
            if (!box) return;
            function sync() {
                btn.disabled = !box.checked;
                $$("[data-gate-on=\"" + box.id + "\"]").forEach(function (el) { el.hidden = !box.checked; });
                $$("[data-gate-off=\"" + box.id + "\"]").forEach(function (el) { el.hidden = box.checked; });
            }
            box.addEventListener("change", sync);
            sync();
        });
    }

    // ---------------------------------------------------------------------
    // 帳號頁表單：必填、Email、密碼規則、驗證碼
    // ---------------------------------------------------------------------
    var PW_RULES = {
        length: function (v) { return v.length >= 8; },
        "case": function (v) { return /[a-z]/.test(v) && /[A-Z]/.test(v); },
        number: function (v) { return /\d/.test(v); },
        special: function (v) { return /[^A-Za-z0-9]/.test(v); }
    };

    function passwordOk(value) {
        return Object.keys(PW_RULES).every(function (rule) { return PW_RULES[rule](value); });
    }

    function initPasswordRules() {
        $$("[data-pw-rules]").forEach(function (list) {
            var input = document.getElementById(list.dataset.pwRules);
            function sync() {
                $$("[data-rule]", list).forEach(function (item) {
                    var met = PW_RULES[item.dataset.rule](input.value);
                    item.classList.toggle("is-met", met);
                });
            }
            input.addEventListener("input", sync);
            sync();
        });
    }

    function randomCaptcha() {
        var chars = "ABCDEFGHJKLMNPRSTUVWXYZ23456789";
        var code = "";
        for (var i = 0; i < 4; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }

    function initCaptcha() {
        $$("[data-captcha-image]").forEach(function (image) {
            image.textContent = randomCaptcha();
        });
        $$("[data-captcha-refresh]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                $$("[data-captcha-image]").forEach(function (image) {
                    image.textContent = randomCaptcha();
                });
                var input = $("[data-captcha-input]");
                if (input) {
                    input.value = "";
                    clearError(input);
                    input.focus();
                }
            });
        });
    }

    // 錯誤摘要：列出欄位名稱並連到欄位；切換語系時重新產生
    var summaryState = null;

    function labelFor(input) {
        var field = fieldOf(input);
        var label = field && (field.querySelector("[data-summary-label]") || field.querySelector(".field__label, .doc-item__title"));
        if (!label) return input.getAttribute("aria-label") || input.name || input.id;
        var copy = label.cloneNode(true);
        $$(".field__req, .field__opt, .chip", copy).forEach(function (el) { el.remove(); });
        return copy.textContent.replace(/\s+/g, " ").trim();
    }

    function renderSummary(summary, invalid, focus) {
        if (!invalid.length) {
            summary.hidden = true;
            summaryState = null;
            return;
        }
        summary.innerHTML = "";
        var title = document.createElement("b");
        title.textContent = t("validation.summary", { n: invalid.length });
        var list = document.createElement("ul");
        invalid.forEach(function (input) {
            var item = document.createElement("li");
            var link = document.createElement("a");
            link.href = "#" + input.id;
            link.textContent = labelFor(input);
            link.addEventListener("click", function (event) {
                event.preventDefault();
                input.focus();
                input.scrollIntoView({ block: "center" });
            });
            item.appendChild(link);
            list.appendChild(item);
        });
        summary.appendChild(title);
        summary.appendChild(list);
        summary.hidden = false;
        summaryState = { summary: summary, invalid: invalid };
        if (focus) {
            summary.focus();
            summary.scrollIntoView({ block: "start" });
        }
    }

    document.addEventListener("oia:langchange", function () {
        if (summaryState) renderSummary(summaryState.summary, summaryState.invalid, false);
    });

    function validateForm(form, options) {
        options = options || {};
        var invalid = [];
        var radios = {};
        function fail(input, key, vars) {
            setError(input, key, vars);
            invalid.push(input);
        }

        $$("input, select, textarea", form).forEach(function (input) {
            if (input.disabled || input.type === "hidden" || input.type === "file" || input.closest("[hidden]")) return;
            clearError(input);

            if (input.type === "radio") {
                if (!input.required || radios[input.name]) return;
                radios[input.name] = true;
                if (!$("input[name=\"" + input.name + "\"]:checked", form)) fail(input, "validation.required");
                return;
            }

            var value = input.type === "checkbox" ? (input.checked ? "on" : "") : input.value.trim();

            if (input.required && !value) return fail(input, "validation.required");
            if (!value) return;
            if (input.type === "email" && !EMAIL_RE.test(value)) return fail(input, "validation.email");
            if (input.type === "email" && input.dataset.blockDomains != null && BLOCKED_EMAIL_RE.test(value)) return fail(input, "validation.emailDomain");
            if (input.dataset.passwordNew != null && !passwordOk(value)) return fail(input, "validation.passwordRules");
            if (input.dataset.matches) {
                var other = document.getElementById(input.dataset.matches);
                if (other && other.value !== input.value) return fail(input, "validation.passwordMismatch");
            }
            if (input.dataset.captchaInput != null) {
                var image = $("[data-captcha-image]");
                if (image && value.replace(/\s/g, "").toUpperCase() !== image.textContent.toUpperCase()) {
                    return fail(input, "validation.captcha");
                }
            }
        });

        // 必要文件尚未上傳
        $$("[data-upload][data-required=\"true\"]", form).forEach(function (upload) {
            var input = $("input[type=\"file\"]", upload);
            if (!input) return;
            clearError(input);
            if (!upload.classList.contains("has-file")) fail(input, "validation.required");
        });

        if (options.extra) options.extra(fail);

        var summary = options.summary || $("[data-error-summary]", form);
        if (summary) renderSummary(summary, invalid, true);
        else if (invalid[0]) invalid[0].focus();
        return !invalid.length;
    }

    function initForms() {
        $$("form[data-validate]").forEach(function (form) {
            form.setAttribute("novalidate", "");
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                if (!validateForm(form)) return;
                if (form.dataset.toast) toast(form.dataset.toast);
                if (form.dataset.next) {
                    var url = form.dataset.next;
                    var email = $("input[type=\"email\"]", form);
                    if (form.dataset.passEmail != null && email) {
                        url += (url.indexOf("?") < 0 ? "?" : "&") + "email=" + encodeURIComponent(email.value.trim());
                    }
                    setTimeout(function () { location.href = url; }, form.dataset.toast ? 900 : 0);
                }
            });
            form.addEventListener("input", function (event) {
                if (event.target.getAttribute("aria-invalid") === "true") clearError(event.target);
            });
        });
    }

    // Check your email：顯示寄送信箱，重新寄送冷卻 60 秒
    function initResend() {
        var email = new URLSearchParams(location.search).get("email");
        $$("[data-sent-email]").forEach(function (el) {
            if (email) {
                var vars = readVars(el) || {};
                vars.email = email;
                el.dataset.i18nVars = JSON.stringify(vars);
            }
        });

        $$("[data-resend]").forEach(function (btn) {
            var seconds = Number(btn.dataset.resend) || 60;
            var timer;
            function tick(left) {
                if (left <= 0) {
                    btn.disabled = false;
                    btn.dataset.i18n = "checkEmail.resend";
                    delete btn.dataset.i18nVars;
                    btn.textContent = t("checkEmail.resend");
                    return;
                }
                btn.disabled = true;
                btn.dataset.i18n = "checkEmail.resendIn";
                btn.dataset.i18nVars = JSON.stringify({ s: left });
                btn.textContent = t("checkEmail.resendIn", { s: left });
                timer = setTimeout(function () { tick(left - 1); }, 1000);
            }
            btn.addEventListener("click", function () {
                clearTimeout(timer);
                toast("checkEmail.resent");
                tick(seconds);
            });
            tick(seconds);
        });
    }

    // ---------------------------------------------------------------------
    // 其他通用：data-toast 按鈕
    // ---------------------------------------------------------------------
    function initMisc() {
        document.addEventListener("click", function (event) {
            var btn = event.target.closest("[data-toast]:not(form)");
            if (btn) toast(btn.dataset.toast);
            var go = event.target.closest("button[data-href]");
            if (go && !go.disabled) location.href = go.dataset.href;
            var disabled = event.target.closest("[aria-disabled=\"true\"]");
            if (disabled) event.preventDefault();
        });
    }

    // ---------------------------------------------------------------------
    // 啟動
    // ---------------------------------------------------------------------
    window.OIA = {
        config: CONFIG,
        t: t,
        get lang() { return lang; },
        setLang: setLang,
        apply: apply,
        toast: toast,
        formatDate: formatDate,
        formatRange: formatRange,
        daysBetween: daysBetween,
        todayISO: todayISO,
        nowStamp: nowStamp,
        setError: setError,
        clearError: clearError,
        validateForm: validateForm,
        updateToc: updateToc,
        dialog: { open: dialogOpen, close: dialogClose },
        $: $,
        $$: $$
    };

    checkDictionaries();
    initHeader();
    initSteps();
    initPortalNav();
    initDialogs();
    initCheckGates();
    initPasswordRules();
    initCaptcha();
    initForms();
    initResend();
    initUploads();
    initToc();
    initMisc();
    render();
})();
