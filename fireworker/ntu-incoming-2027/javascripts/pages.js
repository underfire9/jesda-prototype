/* =============================================================================
   各頁專屬互動（依 body[data-page] 啟用）。示範資料只用於版面，實作時改接後端。
   ========================================================================== */
(function () {
    "use strict";

    var OIA = window.OIA;
    var $ = OIA.$;
    var $$ = OIA.$$;
    var page = document.body.dataset.page;

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function currentTime() {
        var d = new Date();
        return pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function go(url, delay) {
        setTimeout(function () { location.href = url; }, delay == null ? 900 : delay);
    }

    // 更新「上次儲存」時間
    function stampSaved() {
        var time = currentTime();
        $$("[data-last-saved]").forEach(function (el) {
            var vars = {};
            try { vars = JSON.parse(el.dataset.i18nVars || "{}"); } catch (e) { /* 略過 */ }
            vars.time = time;
            el.dataset.i18nVars = JSON.stringify(vars);
        });
        OIA.apply(document);
    }

    // ---------------------------------------------------------------------
    // 申請步驟共用：Save、Save & Next
    // ---------------------------------------------------------------------
    function initProcess() {
        var form = $("[data-process-form]");
        if (!form) return;

        $$("[data-save]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                stampSaved();
                OIA.toast("common.draftSaved");
            });
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            var next = $("[data-next]", form);
            if (!next) return;
            if (form.dataset.customValidate == null && !OIA.validateForm(form)) return;
            if (form.dataset.customValidate != null) {
                var ok = form.dispatchEvent(new CustomEvent("oia:validate", { cancelable: true }));
                if (!ok) return;
            }
            stampSaved();
            OIA.toast("process.toastNext", { step: "t:" + next.dataset.nextStep });
            go(next.dataset.next);
        });
    }

    // ---------------------------------------------------------------------
    // 03 申請紀錄：刪除未送出的申請
    // ---------------------------------------------------------------------
    function initRecord() {
        var pendingRow = null;
        $$("[data-delete-row]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                pendingRow = btn.closest("tr");
            });
        });
        var confirm = $("[data-delete-confirm]");
        if (!confirm) return;
        confirm.addEventListener("click", function () {
            if (pendingRow) pendingRow.remove();
            pendingRow = null;
            OIA.dialog.close();
            var body = $("[data-record-current]");
            var empty = $("[data-record-empty]");
            if (body && empty && body.querySelectorAll("tr:not([data-record-empty])").length === 0) empty.hidden = false;
            var heading = $("#current-title");
            heading.setAttribute("tabindex", "-1");
            heading.focus();
            OIA.toast("record.deleted");
        });
    }

    // ---------------------------------------------------------------------
    // 01 Set password：連結失效（示範 ?expired=1）
    // ---------------------------------------------------------------------
    function initSetPassword() {
        if (new URLSearchParams(location.search).get("expired") == null) return;
        $("[data-link-valid]").hidden = true;
        $("[data-link-expired]").hidden = false;
    }

    // ---------------------------------------------------------------------
    // 05 入臺證：家屬表格＋對話框、同在臺地址、聲明說明欄
    // ---------------------------------------------------------------------
    var family = [
        { rel: "father", name: "Zhang Jianguo", dob: "1968-03-12", status: "alive", job: "Engineer", phone: "+86 138 0013 8000", address: "Haidian District, Beijing" },
        { rel: "mother", name: "Li Hua", dob: "1970-11-05", status: "alive", job: "Teacher", phone: "+86 139 0013 9000", address: "Haidian District, Beijing" }
    ];

    function renderFamily() {
        var body = $("[data-family-rows]");
        body.innerHTML = "";
        if (!family.length) {
            body.innerHTML = "<tr class=\"data-table__empty\"><td colspan=\"6\" data-i18n=\"entry.family.empty\"></td></tr>";
        }
        family.forEach(function (member, index) {
            var row = document.createElement("tr");
            row.innerHTML =
                "<td data-i18n-attr=\"data-label:entry.family.th.relationship\"><span data-i18n=\"entry.family.rel." + member.rel + "\"></span></td>" +
                "<td data-i18n-attr=\"data-label:common.name\"></td>" +
                "<td data-i18n-attr=\"data-label:common.dateOfBirth\" class=\"nowrap\"></td>" +
                "<td data-i18n-attr=\"data-label:entry.family.th.status\"><span data-i18n=\"entry.family.status." + member.status + "\"></span></td>" +
                "<td data-i18n-attr=\"data-label:entry.family.th.occupation\"></td>" +
                "<td class=\"data-table__actions\">" +
                "<button type=\"button\" class=\"link\" data-family-edit=\"" + index + "\" data-i18n=\"common.edit\"></button>" +
                "<button type=\"button\" class=\"link link--muted\" data-family-delete=\"" + index + "\" data-i18n=\"common.delete\"></button>" +
                "</td>";
            // 使用者輸入的資料不翻譯，用 textContent 放入
            row.children[1].textContent = member.name;
            row.children[2].textContent = member.dob;
            row.children[4].textContent = member.job;
            body.appendChild(row);
        });
        $("#entry-family-count").value = family.length ? String(family.length) : "";
        OIA.apply(body);
        OIA.updateToc();
    }

    function initEntry() {
        var dialog = $("#family-dialog");
        var form = $("[data-family-form]");
        var title = $("#family-dialog-title");
        var editing = null;

        function fill(member) {
            form.reset();
            $$("input", form).forEach(function (input) { OIA.clearError(input); });
            if (!member) return;
            $("input[name=\"fm-rel\"][value=\"" + member.rel + "\"]", form).checked = true;
            $("input[name=\"fm-status\"][value=\"" + member.status + "\"]", form).checked = true;
            $("#fm-name").value = member.name;
            $("#fm-dob").value = member.dob;
            $("#fm-job").value = member.job;
            $("#fm-phone").value = member.phone;
            $("#fm-address").value = member.address;
        }

        function open(index, opener) {
            editing = index;
            title.dataset.i18n = index == null ? "familyDialog.title" : "familyDialog.editTitle";
            fill(index == null ? null : family[index]);
            OIA.apply(dialog);
            OIA.dialog.open("family-dialog", opener);
        }

        $("[data-family-add]").addEventListener("click", function (event) {
            open(null, event.currentTarget);
        });

        $("[data-family-rows]").addEventListener("click", function (event) {
            var edit = event.target.closest("[data-family-edit]");
            var remove = event.target.closest("[data-family-delete]");
            if (edit) open(Number(edit.dataset.familyEdit), $("[data-family-add]"));
            if (remove) {
                family.splice(Number(remove.dataset.familyDelete), 1);
                renderFamily();
                OIA.toast("entry.family.deleted");
                $("[data-family-add]").focus();
            }
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!OIA.validateForm(form)) return;
            var member = {
                rel: $("input[name=\"fm-rel\"]:checked", form).value,
                status: $("input[name=\"fm-status\"]:checked", form).value,
                name: $("#fm-name").value.trim(),
                dob: $("#fm-dob").value,
                job: $("#fm-job").value.trim(),
                phone: $("#fm-phone").value.trim(),
                address: $("#fm-address").value.trim()
            };
            if (editing == null) family.push(member);
            else family[editing] = member;
            OIA.dialog.close();
            renderFamily();
            OIA.toast("common.saved");
        });

        renderFamily();

        // 聯絡地址同在臺地址
        var same = $("#entry-same-address");
        var address = $("#entry-tw-address");
        var contactAddress = $("#entry-tw-contact-address");
        function syncAddress() {
            contactAddress.disabled = same.checked;
            if (same.checked) contactAddress.value = address.value;
        }
        same.addEventListener("change", syncAddress);
        address.addEventListener("input", syncAddress);
        syncAddress();

        // 聲明選第 2 或第 3 項才出現說明欄
        var details = $("[data-decl-details]");
        function syncDeclaration() {
            var checked = $("input[name=\"entry-decl\"]:checked");
            details.hidden = !checked || checked.value === "never";
        }
        $$("input[name=\"entry-decl\"]").forEach(function (radio) {
            radio.addEventListener("change", syncDeclaration);
        });
        syncDeclaration();
    }

    // ---------------------------------------------------------------------
    // 07 繳費：付款方式二選一（實際付款頁不在範圍內）
    // ---------------------------------------------------------------------
    function initPayment() {
        $$("[data-pay]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var method = btn.dataset.pay;
                $$("[data-pay-option]").forEach(function (option) {
                    option.classList.toggle("is-selected", option.dataset.payOption === method);
                });
                $("#pay-method").value = method;
                OIA.updateToc();
                OIA.toast("payment.outOfScope");
            });
        });
    }

    // ---------------------------------------------------------------------
    // 08 預覽與送出
    // ---------------------------------------------------------------------
    function initPreview() {
        var submit = $("[data-submit-application]");
        if (!submit) return;
        submit.addEventListener("click", function () {
            if (submit.disabled) return;
            submit.disabled = true;
            OIA.toast("preview.submitted");
            go("/portal/review.html", 1200);
        });
    }

    // ---------------------------------------------------------------------
    // 09–11 上傳類表單：補件、註冊文件、離校手續單
    // ---------------------------------------------------------------------
    function initUploadForm(selector, toastKey) {
        var form = $(selector);
        if (!form) return;
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!OIA.validateForm(form)) return;
            $$("button", form).forEach(function (btn) { btn.disabled = true; });
            $$("[data-upload-remove]", form).forEach(function (btn) { btn.hidden = true; });
            OIA.toast(toastKey);
        });
    }

    // ---------------------------------------------------------------------
    // 10 入學資訊：是否報到（只能送出一次）
    // ---------------------------------------------------------------------
    var ATTEND_KEY = "oia-demo-attend";

    function showAttendDone(state) {
        var form = $("[data-attend-form]");
        var done = $("[data-attend-done]", form);
        $("input[value=\"" + state.value + "\"]", form).checked = true;
        $$("input", form).forEach(function (input) { input.disabled = true; });
        $("button[type=\"submit\"]", form).hidden = true;
        done.dataset.i18n = "common.submittedAt";
        done.dataset.i18nVars = JSON.stringify({ datetime: state.at });
        done.hidden = false;
        OIA.apply(form);
    }

    function initAdmission() {
        var form = $("[data-attend-form]");
        if (!form) return;
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(ATTEND_KEY)); } catch (e) { /* 略過 */ }
        if (saved) showAttendDone(saved);

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!OIA.validateForm(form)) return;
            var state = { value: $("input[name=\"attend\"]:checked", form).value, at: OIA.nowStamp() };
            try { localStorage.setItem(ATTEND_KEY, JSON.stringify(state)); } catch (e) { /* 略過 */ }
            showAttendDone(state);
            OIA.toast("common.saved");
        });
    }

    // ---------------------------------------------------------------------
    initProcess();

    switch (page) {
        case "record":
            initRecord();
            break;
        case "setPassword":
            initSetPassword();
            break;
        case "entryPermit":
            initEntry();
            break;
        case "payment":
            initPayment();
            break;
        case "preview":
            initPreview();
            break;
        case "supplement":
            initUploadForm("[data-supplement-form]", "supplement.submitted");
            break;
        case "regDocs":
            initUploadForm("[data-regdocs-form]", "regDocs.submitted");
            break;
        case "departure":
            initUploadForm("[data-departure-form]", "departure.submitted");
            break;
        case "admission":
            initAdmission();
            break;
    }

    // 頁面初始化可能改變欄位狀態，重新計算 On this page 進度
    OIA.updateToc();
})();
