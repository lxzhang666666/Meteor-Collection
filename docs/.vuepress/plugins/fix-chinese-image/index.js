// VuePress 插件：修复含中文图片路径被 URL 编码导致构建失败的问题
// markdown-it 的 normalizeLink() 会对 src 中的中文进行编码，
// 导致 webpack 在模块解析时找不到原始文件名的文件
module.exports = (options, ctx) => ({
  name: 'fix-chinese-image',
  extendMarkdown: (md) => {
    const originalImage = md.renderer.rules.image
    md.renderer.rules.image = (tokens, idx, options, env, slf) => {
      const token = tokens[idx]
      if (token.attrs) {
        for (const attr of token.attrs) {
          if (attr[0] === 'src' && attr[1]) {
            try {
              attr[1] = decodeURIComponent(attr[1])
            } catch (e) {
              // ignore
            }
          }
        }
      }
      if (originalImage) {
        return originalImage(tokens, idx, options, env, slf)
      }
      return slf.renderToken(tokens, idx, options)
    }
  },
})
