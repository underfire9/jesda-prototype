/* =============================================================================
   04 申請表（步驟 1）：由 reference/application-form.src.html 移植
   - 國家／學校 combobox、出生年月日、接待學院／系所連動、指導教授搜尋、研究期間
   - 切換語系時：已選的值保留，只換顯示文字；錯誤訊息隨語系更新
   以下清單皆為示意資料，實作時改由後端提供（雙語）。
   ========================================================================== */
(function () {
    "use strict";

    var OIA = window.OIA;
    var $ = OIA.$;
    var $$ = OIA.$$;
    var form = $("#app-form");
    if (!form) return;

    function zh() {
        return OIA.lang === "zh-Hant";
    }

    function esc(value) {
        return String(value).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
        });
    }

    // ---------------------------------------------------------------------
    // 示意資料
    // ---------------------------------------------------------------------
    var COUNTRIES = [
        ["AU", "Australia", "澳洲"], ["CA", "Canada", "加拿大"], ["CN", "China", "中國大陸"], ["CZ", "Czech Republic", "捷克"],
        ["FR", "France", "法國"], ["DE", "Germany", "德國"], ["IN", "India", "印度"], ["ID", "Indonesia", "印尼"],
        ["IT", "Italy", "義大利"], ["JP", "Japan", "日本"], ["KR", "Korea, Republic of", "韓國"], ["MY", "Malaysia", "馬來西亞"],
        ["MN", "Mongolia", "蒙古"], ["NL", "Netherlands", "荷蘭"], ["NZ", "New Zealand", "紐西蘭"], ["PH", "Philippines", "菲律賓"],
        ["PL", "Poland", "波蘭"], ["SG", "Singapore", "新加坡"], ["ES", "Spain", "西班牙"], ["SE", "Sweden", "瑞典"],
        ["CH", "Switzerland", "瑞士"], ["TH", "Thailand", "泰國"], ["GB", "United Kingdom", "英國"], ["US", "United States", "美國"],
        ["VN", "Viet Nam", "越南"]
    ];

    var UNIS = {
        US: ["University of Washington", "University of California, Berkeley", "Massachusetts Institute of Technology", "University of Michigan"],
        JP: ["The University of Tokyo", "Kyoto University", "Osaka University"],
        KR: ["Seoul National University", "KAIST", "Yonsei University"],
        CN: ["Peking University", "Tsinghua University", "Fudan University"],
        DE: ["Technical University of Munich", "Heidelberg University"],
        PH: ["University of the Philippines Diliman", "Ateneo de Manila University", "De La Salle University"],
        IN: ["IIT Bombay", "Indian Institute of Science"],
        ID: ["Universitas Indonesia", "Institut Teknologi Bandung"],
        VN: ["Vietnam National University, Hanoi", "Hanoi University of Science and Technology"],
        FR: ["Sorbonne Université", "Université Paris-Saclay"],
        GB: ["University of Edinburgh", "University College London"],
        TH: ["Chulalongkorn University", "Mahidol University"],
        MY: ["Universiti Malaya"],
        CA: ["University of Toronto", "McGill University"],
        AU: ["The University of Melbourne", "Australian National University"]
    };

    var COLLEGES = [
        ["lib", "College of Liberal Arts", "文學院", [["Chinese Literature", "中國文學系"], ["Foreign Languages and Literatures", "外國語文學系"], ["History", "歷史學系"], ["Philosophy", "哲學系"], ["Anthropology", "人類學系"]]],
        ["sci", "College of Science", "理學院", [["Mathematics", "數學系"], ["Physics", "物理學系"], ["Chemistry", "化學系"], ["Geosciences", "地質科學系"], ["Psychology", "心理學系"], ["Geography", "地理環境資源學系"], ["Atmospheric Sciences", "大氣科學系"]]],
        ["soc", "College of Social Sciences", "社會科學院", [["Political Science", "政治學系"], ["Economics", "經濟學系"], ["Sociology", "社會學系"], ["Social Work", "社會工作學系"]]],
        ["med", "College of Medicine", "醫學院", [["Medicine", "醫學系"], ["Nursing", "護理學系"], ["Pharmacy", "藥學系"]]],
        ["eng", "College of Engineering", "工學院", [["Civil Engineering", "土木工程學系"], ["Mechanical Engineering", "機械工程學系"], ["Chemical Engineering", "化學工程學系"], ["Engineering Science and Ocean Engineering", "工程科學及海洋工程學系"], ["Materials Science and Engineering", "材料科學與工程學系"]]],
        ["bio", "College of Bio-Resources and Agriculture", "生物資源暨農學院", [["Agronomy", "農藝學系"], ["Forestry and Resource Conservation", "森林環境暨資源學系"], ["Bioenvironmental Systems Engineering", "生物環境系統工程學系"]]],
        ["mgt", "College of Management", "管理學院", [["Business Administration", "工商管理學系"], ["Accounting", "會計學系"], ["Finance", "財務金融學系"], ["Information Management", "資訊管理學系"]]],
        ["ph", "College of Public Health", "公共衛生學院", [["Epidemiology and Preventive Medicine", "流行病學與預防醫學研究所"], ["Health Policy and Management", "健康政策與管理研究所"]]],
        ["eecs", "College of Electrical Engineering and Computer Science", "電機資訊學院", [["Electrical Engineering", "電機工程學系"], ["Computer Science and Information Engineering", "資訊工程學系"], ["Communication Engineering", "電信工程學研究所"]]],
        ["law", "College of Law", "法律學院", [["Law", "法律學系"]]],
        ["life", "College of Life Science", "生命科學院", [["Life Science", "生命科學系"], ["Biochemical Science and Technology", "生化科技學系"]]]
    ];

    // 指導教授：版面示意用的範例資料
    var ADVISORS = [
        { n: "Lin, Chia-Hsin", z: "林家欣", e: "chlin@ntu.example", c: "eng", d: 0 },
        { n: "Chen, Yu-Ting", z: "陳雨婷", e: "ytchen@ntu.example", c: "eng", d: 0 },
        { n: "Huang, Shu-Fen", z: "黃淑芬", e: "sfhuang@ntu.example", c: "eng", d: 4 },
        { n: "Wang, Po-Wei", z: "王柏維", e: "pwwang@ntu.example", c: "eng", d: 1 },
        { n: "Tsai, Mei-Ling", z: "蔡美玲", e: "mltsai@ntu.example", c: "sci", d: 1 },
        { n: "Liu, Cheng-Han", z: "劉承翰", e: "chliu@ntu.example", c: "eecs", d: 1 }
    ];

    // ---------------------------------------------------------------------
    // 出生年月日：切換語系時保留已選的值
    // ---------------------------------------------------------------------
    var dob = { y: "1998", m: "4", d: "17" };
    var MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function option(value, text, selected) {
        return "<option value=\"" + value + "\"" + (selected ? " selected" : "") + ">" + esc(text) + "</option>";
    }

    function fillDob() {
        var year = $("#f-dob-y");
        var month = $("#f-dob-m");
        var day = $("#f-dob-d");
        if (year.options.length) {
            dob.y = year.value;
            dob.m = month.value;
            dob.d = day.value;
        }

        var html = option("", OIA.t("form.personal.year"));
        for (var y = 2010; y >= 1960; y -= 1) html += option(y, y, String(y) === dob.y);
        year.innerHTML = html;

        html = option("", OIA.t("form.personal.month"));
        for (var m = 1; m <= 12; m += 1) html += option(m, zh() ? m + " 月" : MONTHS_EN[m - 1], String(m) === dob.m);
        month.innerHTML = html;

        var days = new Date(Number(dob.y) || 2000, Number(dob.m) || 1, 0).getDate();
        html = option("", OIA.t("form.personal.day"));
        for (var d = 1; d <= days; d += 1) html += option(d, d, String(d) === dob.d);
        day.innerHTML = html;
    }

    ["#f-dob-y", "#f-dob-m"].forEach(function (selector) {
        $(selector).addEventListener("change", fillDob);
    });

    // ---------------------------------------------------------------------
    // Combobox：可輸入搜尋，中英文名稱皆可比對
    // ---------------------------------------------------------------------
    var combos = [];

    function Combo(wrap) {
        var input = $("input", wrap);
        var source = wrap.dataset.source;
        var list = document.createElement("ul");
        list.className = "listbox";
        list.setAttribute("role", "listbox");
        list.id = input.id + "-listbox";
        list.hidden = true;
        wrap.appendChild(list);
        input.setAttribute("aria-controls", list.id);

        var items = [];
        var active = -1;

        function all() {
            if (source === "countries") {
                return COUNTRIES.map(function (c) {
                    return { v: c[0], label: zh() ? c[2] : c[1], alt: zh() ? c[1] : c[2] };
                });
            }
            return (UNIS[$("#f-hcountry").dataset.value] || []).map(function (u) {
                return { v: u, label: u, alt: "" };
            });
        }

        function sync() {
            var match = all().filter(function (item) { return item.v === input.dataset.value; })[0];
            if (match) input.value = match.label;
        }

        function render(query) {
            query = (query || "").trim().toLowerCase();
            items = all().filter(function (item) {
                return !query || item.label.toLowerCase().indexOf(query) >= 0 || item.alt.toLowerCase().indexOf(query) >= 0 || item.v.toLowerCase() === query;
            });
            active = items.length ? 0 : -1;
            list.innerHTML = items.length
                ? items.map(function (item, index) {
                    return "<li role=\"option\" id=\"" + list.id + "-" + index + "\" data-index=\"" + index + "\" aria-selected=\"" + (index === active) + "\">" +
                        esc(item.label) + (item.alt ? "<small>" + esc(item.alt) + "</small>" : "") + "</li>";
                }).join("")
                : "<li class=\"is-empty\">" + esc(OIA.t("form.noMatch")) + "</li>";
            list.hidden = false;
            input.setAttribute("aria-expanded", "true");
        }

        function close() {
            list.hidden = true;
            input.setAttribute("aria-expanded", "false");
            input.removeAttribute("aria-activedescendant");
        }

        function pick(index) {
            var item = items[index];
            if (!item) return;
            input.value = item.label;
            input.dataset.value = item.v;
            close();
            OIA.clearError(input);
            input.dispatchEvent(new Event("picked"));
            OIA.updateToc();
        }

        function move(step) {
            if (!items.length) return;
            active = (active + step + items.length) % items.length;
            $$("li", list).forEach(function (li, index) {
                li.setAttribute("aria-selected", String(index === active));
            });
            var li = list.children[active];
            li.scrollIntoView({ block: "nearest" });
            input.setAttribute("aria-activedescendant", li.id);
        }

        input.addEventListener("focus", function () { render(""); });
        input.addEventListener("input", function () {
            // 學校找不到時可直接輸入；國家必須從清單選取
            input.dataset.value = source === "universities" ? input.value : "";
            render(input.value);
        });
        input.addEventListener("keydown", function (event) {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                if (list.hidden) render(input.value);
                else move(1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                move(-1);
            } else if (event.key === "Enter" && !list.hidden) {
                event.preventDefault();
                pick(active);
            } else if (event.key === "Escape") {
                close();
            }
        });
        list.addEventListener("mousedown", function (event) {
            var li = event.target.closest("li[data-index]");
            if (!li) return;
            event.preventDefault();
            pick(Number(li.dataset.index));
        });
        input.addEventListener("blur", function () { setTimeout(close, 120); });

        var combo = { input: input, sync: sync };
        combos.push(combo);
        sync();
        return combo;
    }

    $$(".combo", form).forEach(Combo);

    $("#f-hcountry").addEventListener("picked", function () {
        var uni = $("#f-huni");
        uni.value = "";
        uni.dataset.value = "";
    });

    // 找不到學校：停用學校清單，改填完整英文名稱
    function syncUnlisted() {
        var on = $("#f-unlisted").checked;
        var uni = $("#f-huni");
        $("#unlisted-wrap").hidden = !on;
        uni.disabled = on;
        if (on) {
            uni.value = "";
            uni.dataset.value = "";
            OIA.clearError(uni);
        } else {
            OIA.clearError($("#f-huni-name"));
        }
        OIA.updateToc();
    }
    $("#f-unlisted").addEventListener("change", syncUnlisted);

    // ---------------------------------------------------------------------
    // 接待學院 → 系所
    // ---------------------------------------------------------------------
    var host = { c: "eng", d: "0" };

    function collegeName(college) {
        return zh() ? college[2] : college[1];
    }

    function deptName(college, index) {
        var dept = college[3][index];
        return dept ? (zh() ? dept[1] : dept[0]) : "";
    }

    function fillColleges() {
        var select = $("#f-ncollege");
        select.innerHTML = option("", OIA.t("common.choose")) + COLLEGES.map(function (college) {
            return option(college[0], collegeName(college), college[0] === host.c);
        }).join("");
        fillDepts();
    }

    function fillDepts() {
        var select = $("#f-ndept");
        var college = COLLEGES.filter(function (c) { return c[0] === host.c; })[0];
        select.disabled = !college;
        select.innerHTML = option("", OIA.t("common.choose")) + (college ? college[3].map(function (dept, index) {
            return option(index, zh() ? dept[1] : dept[0], String(index) === host.d);
        }).join("") : "");
    }

    $("#f-ncollege").addEventListener("change", function () {
        host.c = $("#f-ncollege").value;
        host.d = "";
        fillDepts();
        if (!$("#adv-results").hidden) search();
    });
    $("#f-ndept").addEventListener("change", function () {
        host.d = $("#f-ndept").value;
    });

    // ---------------------------------------------------------------------
    // 指導教授
    // ---------------------------------------------------------------------
    var advisor = 0;

    function advisorName(a) {
        return OIA.t("form.ntu.prof", { name: zh() ? a.z + "　" + a.n : a.n });
    }

    function advisorDept(a) {
        var college = COLLEGES.filter(function (c) { return c[0] === a.c; })[0];
        return college ? deptName(college, a.d) : "";
    }

    function renderAdvisor() {
        var picked = $("#adv-picked");
        var searchBox = $("#adv-search");
        $("#f-advisor").value = advisor === null ? "" : String(advisor);

        if (advisor !== null) {
            var a = ADVISORS[advisor];
            picked.innerHTML =
                "<span class=\"picked__initial\" aria-hidden=\"true\">" + esc(a.n[0]) + "</span>" +
                "<span class=\"picked__who\"><b>" + esc(advisorName(a)) + "</b><span>" + esc(advisorDept(a)) + " · " + esc(a.e) + "</span></span>" +
                "<button type=\"button\" class=\"btn btn--sm\" id=\"adv-change\">" + esc(OIA.t("form.ntu.change")) + "</button>";
            picked.hidden = false;
            searchBox.hidden = true;
            $("#adv-change").addEventListener("click", function () {
                advisor = null;
                renderAdvisor();
                OIA.updateToc();
                $("#f-advq").focus();
            });
        } else {
            picked.hidden = true;
            searchBox.hidden = false;
            if (!$("#adv-results").hidden) search();
        }
    }

    function search() {
        var query = $("#f-advq").value.trim().toLowerCase();
        var college = $("#f-ncollege").value;
        var results = $("#adv-results");
        var rows = ADVISORS.map(function (a, index) { return { a: a, index: index }; }).filter(function (row) {
            return (!college || row.a.c === college) && (!query || (row.a.n + row.a.z + row.a.e).toLowerCase().indexOf(query) >= 0);
        });

        results.innerHTML = rows.length
            ? "<table class=\"data-table\"><thead><tr>" +
                "<th scope=\"col\">" + esc(OIA.t("common.name")) + "</th>" +
                "<th scope=\"col\">" + esc(OIA.t("common.email")) + "</th>" +
                "<th scope=\"col\">" + esc(OIA.t("admission.hostDept")) + "</th>" +
                "<th scope=\"col\"><span class=\"visually-hidden\">" + esc(OIA.t("record.th.action")) + "</span></th>" +
                "</tr></thead><tbody>" +
                rows.map(function (row) {
                    return "<tr><td>" + esc(advisorName(row.a)) + "</td><td class=\"mono\">" + esc(row.a.e) + "</td><td>" + esc(advisorDept(row.a)) + "</td>" +
                        "<td class=\"data-table__actions\"><button type=\"button\" class=\"btn btn--sm\" data-advisor=\"" + row.index + "\">" + esc(OIA.t("form.ntu.choose")) + "</button></td></tr>";
                }).join("") +
                "</tbody><caption>" + esc(OIA.t("form.ntu.sample")) + "</caption></table>"
            : "<p class=\"hint advisor-results__empty\">" + esc(OIA.t("form.ntu.noResult")) + "</p>";
        results.hidden = false;

        $$("[data-advisor]", results).forEach(function (btn) {
            btn.addEventListener("click", function () {
                advisor = Number(btn.dataset.advisor);
                OIA.clearError($("#f-advq"));
                renderAdvisor();
                OIA.updateToc();
            });
        });
    }

    $("#adv-go").addEventListener("click", search);
    $("#f-advq").addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            search();
        }
    });

    // ---------------------------------------------------------------------
    // 研究期間：最長 180 天
    // ---------------------------------------------------------------------
    var periodError = null;

    function updatePeriod() {
        var start = $("#f-start").value;
        var end = $("#f-end").value;
        var box = $("#days");
        var meter = $("#meter");
        var hint = $("#period-hint");

        if (!start || !end) {
            box.innerHTML = "<b>—</b>";
            meter.firstElementChild.style.width = "0";
            periodError = null;
            return true;
        }

        var n = OIA.daysBetween(start, end);
        periodError = n < 1 ? "form.ntu.periodOrder" : n > 180 ? "form.ntu.periodOver" : null;
        var text = OIA.t("common.days", { n: n < 1 ? 0 : n });
        box.innerHTML = esc(text).replace(String(n < 1 ? 0 : n), "<b>" + (n < 1 ? 0 : n) + "</b>");
        box.classList.toggle("is-bad", !!periodError);
        meter.classList.toggle("is-bad", !!periodError);
        meter.firstElementChild.style.width = Math.min(100, Math.max(0, n / 180 * 100)) + "%";

        hint.dataset.i18n = periodError || "form.ntu.periodHint";
        hint.textContent = OIA.t(hint.dataset.i18n);
        hint.classList.toggle("is-error", !!periodError);
        return !periodError;
    }

    ["#f-start", "#f-end"].forEach(function (selector) {
        $(selector).addEventListener("input", updatePeriod);
    });

    // ---------------------------------------------------------------------
    // 住宿：選「否」時隱藏房型；兩個志願不可相同
    // ---------------------------------------------------------------------
    function syncDorm() {
        var checked = $("input[name=\"dorm\"]:checked");
        $("#dorm-pref").hidden = !checked || checked.value !== "yes";
    }
    $$("input[name=\"dorm\"]").forEach(function (radio) {
        radio.addEventListener("change", syncDorm);
    });

    $$("input[name=\"pref1\"], input[name=\"pref2\"]").forEach(function (radio) {
        radio.addEventListener("change", function () {
            var other = radio.name === "pref1" ? "pref2" : "pref1";
            var value = radio.value === "twin" ? "quad" : "twin";
            $("input[name=\"" + other + "\"][value=\"" + value + "\"]").checked = true;
        });
    });

    // ---------------------------------------------------------------------
    // 驗證：Email 網域於離開欄位時檢查；Save & Next 時檢查全部
    // ---------------------------------------------------------------------
    var BLOCKED = /(\.cn|@qq\.com|@126\.com|@163\.com)$/i;
    $("#f-email").addEventListener("blur", function () {
        var email = $("#f-email");
        OIA.clearError(email);
        if (email.value.trim() && BLOCKED.test(email.value.trim())) OIA.setError(email, "validation.emailDomain");
    });

    form.addEventListener("oia:validate", function (event) {
        var ok = OIA.validateForm(form, {
            extra: function (fail) {
                if (advisor === null) fail($("#f-advq"), "validation.required");
                if (!updatePeriod() && periodError) fail($("#f-end"), periodError);
            }
        });
        // 研究期間的錯誤已顯示在下方提示文字，不重複顯示
        var duplicate = document.getElementById("f-end-error");
        if (duplicate) duplicate.remove();
        if (!ok) event.preventDefault();
    });

    // ---------------------------------------------------------------------
    // 語系切換：重建下拉選項（保留已選的值）與動態文字
    // ---------------------------------------------------------------------
    document.addEventListener("oia:langchange", function () {
        fillDob();
        fillColleges();
        combos.forEach(function (combo) { combo.sync(); });
        renderAdvisor();
        updatePeriod();
    });

    // 啟動
    fillDob();
    fillColleges();
    renderAdvisor();
    syncDorm();
    updatePeriod();
    OIA.updateToc();
})();
