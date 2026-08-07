# CLAUDE.md

本文件为 Claude Code 在此代码库中工作时提供指导。

## 项目概述

**Meteor-Collection** 是一个基于 VuePress + `vuepress-theme-vdoing` 主题的个人技术博客，部署在 GitHub Pages。主题版本为 v1.12.5，VuePress 版本为 1.9.5。

- 博客名称：Marvel-Site
- 作者：Marvel (zouquchen)
- 远程仓库：`git@github.com:lxzhang666666/Meteor-Collection.git`
- 分支：main

## 常用命令

```bash
# 安装依赖
yarn install

# 本地开发（启动热更新服务器）
yarn dev

# 构建静态站点
yarn build

# 部署到 GitHub Pages（执行 deploy.sh）
yarn deploy

# 生成百度链接推送文件并推送
yarn baiduPush <域名>
```

## 架构说明

### 目录结构

- `docs/` — 笔记源文件，所有 `.md` 内容均在此目录
- `docs/.vuepress/` — VuePress 站点配置，**非** `node_modules` 中安装的 `vdoing` 主题包
  - `config.ts` — 主配置文件（主题、导航、侧边栏、插件等）
  - `config/htmlModules.ts` — 自定义 HTML 模块（广告位等，目前为空）
  - `config/sidebar.js` — 侧边栏结构
  - `common/nav.ts` — 导航栏配置
  - `components/` — 自定义 Vue 组件（WebInfo、IndexBigImg、Twikoo 评论、PageInfo、BlockToggle 等）
  - `plugins/` — 自定义 VuePress 插件
  - `styles/` — 自定义样式
  - `webSiteInfo/` — 站点统计逻辑（阅读量、字数等）
- `vdoing/` — 本地主题包副本（未使用，可通过注释切换）
- `utils/` — 工具脚本
  - `baiduPush.js` — 生成百度链接推送文件
  - `editFrontmatter.js` — 批量编辑 front matter
  - `config.yml` — 批量编辑配置
  - `modules/` — 模块工具函数
  - `workflows/` — GitHub Actions 模板（`baiduPush.yml`、`ci.yml`），**非本项目实际使用的 workflow**

### 笔记目录规则

笔记按数字编号排序（`docs/` 根目录）：
- `10.后端/` — Java、计算机基础、框架/中间件、架构
- `20.前端/` — 基础、框架、Node
- `30.技能学习/` — 技能学习类笔记
- `40.读书笔记/` — 读书笔记
- `60.快速笔记/` — 速记类
- `70.工具/` — 工具配置使用
- `80.更多/` — 关于、收藏、草稿

每个大目录下用数字前缀的子目录继续细分（如 `10.Java/`、`20.计算机基础/`），文件同样用数字前缀排序。

### 页面类型

- 普通文章：包含 front matter（title、date、tags、categories 等），自动生成归档/分类/标签页
- 自定义页：front matter 中设置 `article: false`，不会出现在归档/标签/分类统计中
- `@pages/` 目录下的页面为自定义非文章页面

### 插件与功能

使用的 VuePress 插件：
- `vuepress-plugin-baidu-autopush` — 百度自动推送
- `vuepress-plugin-baidu-tongji` — 百度统计
- `one-click-copy` — 代码块复制按钮
- `demo-block` — demo 演示模块
- `vuepress-plugin-zooming` — 图片放大
- `@vuepress/last-updated` — 上次更新时间
- 自定义 `custom-plugins` — 网页信息统计、代码块折叠、Twikoo 评论

### 部署方式

- 当前使用 `deploy.sh` 脚本本地部署（提交到 GitHub 后手动执行）
- `utils/workflows/` 下保留了 GitHub Actions 模板，但尚未启用（`deploy` 脚本中 GitHub Actions 部分已注释）
- `baiduPush.sh` 和 `push.sh` 为部署辅助脚本

### 前端配置说明

`docs/.vuepress/config.ts` 中配置了：
- 站点语言：`zh-CN`
- 首页背景图：阿里云 OSS 存储的多张背景图（当前使用 bg12.jpg）
- 首页描述语轮播：4 条名人名言
- 博主信息：头像、昵称、签名
- 社交图标：邮件、GitHub、CSDN
- 页脚：创建年份 2022，版权信息

## 注意事项

- 编辑笔记时确保 front matter 中 `permalink` 字段正确设置（控制百度推送的 URL）
- 新增分类目录后，需要同步更新 `config.ts` 中的侧边栏和导航配置
- `.vuepress/config.ts` 是核心配置文件，修改后重启 dev 服务生效
- `utils/workflows/` 中的 CI/CD 模板仅供参考，实际部署依赖 `deploy.sh` 脚本