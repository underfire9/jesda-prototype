// 將 i18n/en.json、i18n/zh-Hant.json 轉成瀏覽器可直接載入的 javascripts/i18n.js，並檢查兩份 key 是否一致。
// 用法：node tools/build-i18n.js
// 修改任一份 json 後都要重新執行一次。

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, "i18n", file), "utf8"));

const en = read("en.json");
const zh = read("zh-Hant.json");

const missingInZh = Object.keys(en).filter((key) => !(key in zh));
const missingInEn = Object.keys(zh).filter((key) => !(key in en));

if (missingInZh.length || missingInEn.length) {
    if (missingInZh.length) console.error("zh-Hant.json 缺少：\n  " + missingInZh.join("\n  "));
    if (missingInEn.length) console.error("en.json 缺少：\n  " + missingInEn.join("\n  "));
    process.exit(1);
}

const output = [
    "/* 由 tools/build-i18n.js 產生，請勿直接修改。來源：i18n/en.json、i18n/zh-Hant.json */",
    "window.OIA_I18N = {",
    "    \"en\": " + JSON.stringify(en, null, 4).replace(/\n/g, "\n    ") + ",",
    "    \"zh-Hant\": " + JSON.stringify(zh, null, 4).replace(/\n/g, "\n    "),
    "};",
    ""
].join("\n");

fs.mkdirSync(path.join(root, "javascripts"), { recursive: true });
fs.writeFileSync(path.join(root, "javascripts", "i18n.js"), output, "utf8");
console.log("javascripts/i18n.js 已更新（" + Object.keys(en).length + " 個 key）。");
