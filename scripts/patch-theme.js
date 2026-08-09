/**
 * 构建前脚本：自动修改 vuepress-theme-vdoing 以排除 assets 目录
 */
const fs = require('fs');
const path = require('path');

const themeFile = path.join(__dirname, '../node_modules/vuepress-theme-vdoing/node_utils/getSidebarData.js');

if (!fs.existsSync(themeFile)) {
  console.log('Theme file not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(themeFile, 'utf8');

// 检查是否已经打过补丁
if (content.includes("name !== 'assets'")) {
  console.log('Theme already patched, skipping');
  process.exit(0);
}

// 在 readTocs 函数中添加 assets 排除
content = content.replace(
  "name !== '.vuepress' && name !== '@pages'",
  "name !== '.vuepress' && name !== '@pages' && name !== 'assets'"
);

// 在 mapTocToSidebar 函数中添加 assets 排除
content = content.replace(
  "if (filename === '.DS_Store') { // 过滤.DS_Store文件\n      return\n    }",
  "if (filename === '.DS_Store') { // 过滤.DS_Store文件\n      return\n    }\n    if (filename === 'assets') { // 过滤assets文件夹\n      return\n    }"
);

fs.writeFileSync(themeFile, content, 'utf8');
console.log('Theme patched successfully');
