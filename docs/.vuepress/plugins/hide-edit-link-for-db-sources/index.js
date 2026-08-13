// VuePress 插件：为 source: db 的动态文章隐藏 GitHub 编辑按钮
// 当文章的 frontmatter 中包含 source: db 时，自动设置 editLink: false
// 使主题不会生成跳转到 GitHub 的编辑链接，只保留 ArticleEditor 浮动按钮
module.exports = (options, ctx) => ({
  name: 'hide-edit-link-for-db-sources',
  extendPageData(page) {
    if (page.frontmatter.source === 'db') {
      page.frontmatter.editLink = false
    }
  },
})
