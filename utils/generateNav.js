/**
 * 自动生成导航配置 nav.ts
 *
 * 原理：
 * 1. 扫描 docs/ 根目录，找到所有一级子目录（排除 .vuepress、@pages、00.目录）
 * 2. 读取 docs/00.目录/<N>.<目录名>.md 获取导航项的 title 和 permalink
 * 3. 扫描每个一级目录下的二级子目录，找到第一个非 index 文章的 permalink 作为分类链接
 * 4. 读取 utils/navOverrides.js 中的手动配置，与自动生成结果合并
 * 5. 将结果输出为 TypeScript 格式，写入 docs/.vuepress/common/nav.ts
 *
 * 使用方式：
 *   node utils/generateNav.js          # 从 docs 目录读取配置
 *   node utils/generateNav.js /path/to/docs  # 指定 docs 目录
 *
 * ============================================================
 * 可配置项
 * ============================================================
 * 1. CONFIG 对象：排除目录、输出格式等
 * 2. navOverrides.js：手动覆盖、3级菜单、特殊页面等
 *
 * 优先级：navOverrides > 自动生成
 * ============================================================
 */

const fs = require('fs')
const path = require('path')
const navOverrides = require('./navOverrides')

// ============================================================
// 配置区
// ============================================================
const CONFIG = {
  /**
   * 要排除的一级目录名（完整目录名）
   * 这些目录无论是否为空都不会出现在导航中
   */
  excludeDirs: [
    '40.技能学习',
    '50.读书笔记',
  ],

  /**
   * 目录索引文件所在目录（相对于 docs 目录）
   */
  catalogDir: '00.目录',

  /**
   * 输出格式: 'ts' | 'js'
   */
  outputFormat: 'ts',
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 从 markdown 文件的 front matter 中提取指定字段
 * 兼容 Windows \r\n 换行符
 */
function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm = {}
  const lines = match[1].split('\n')
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (value) fm[key] = value
  }
  return fm
}

/**
 * 从 docs/00.目录/*.md 中找到对应目录的配置
 */
function readCatalogEntry(catalogDir, dirName) {
  const fileName = dirName + '.md'
  const filePath = path.join(catalogDir, fileName)
  if (!fs.existsSync(filePath)) return null
  const content = fs.readFileSync(filePath, 'utf-8')
  return parseFrontmatter(content)
}

/**
 * 获取目录下的第一个非 index 文章的 permalink
 * 先检查当前层文件，再递归子目录
 */
function findFirstArticlePermalink(dir) {
  if (!fs.existsSync(dir)) return null
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  // 1. 先检查当前层是否有文章文件
  for (const entry of entries) {
    if (entry.isDirectory()) continue
    if (!entry.name.endsWith('.md')) continue
    if (entry.name.startsWith('00.')) continue
    const filePath = path.join(dir, entry.name)
    const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n')
    const fm = parseFrontmatter(content)
    if (fm && fm.permalink) return fm.permalink
  }

  // 2. 递归搜索子目录
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const result = findFirstArticlePermalink(path.join(dir, entry.name))
      if (result) return result
    }
  }
  return null
}

/**
 * 获取二级子目录信息（用于自动生成子菜单）
 */
function getSubdirectories(dir) {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const results = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const subPath = path.join(dir, entry.name)
    const link = findFirstArticlePermalink(subPath)
    const displayName = entry.name.replace(/^\d+\./, '')
    results.push({
      name: entry.name,
      displayName,
      link,
      articleCount: countArticles(subPath),
    })
  }
  return results
}

/**
 * 统计目录下的文章数量（排除 index 类文件）
 */
function countArticles(dir) {
  if (!fs.existsSync(dir)) return 0
  let count = 0
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countArticles(path.join(dir, entry.name))
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('00.')) {
      count++
    }
  }
  return count
}

/**
 * 判断目录是否为空
 */
function isEmptyDir(dir) {
  return countArticles(dir) === 0
}

// ============================================================
// 自动生成导航
// ============================================================

function generateNavItems(docsDir) {
  const catalogDir = path.join(docsDir, CONFIG.catalogDir)

  // 收集所有一级目录
  const topLevelDirs = fs
    .readdirSync(docsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => {
      if (name === '.vuepress' || name === '@pages' || name === CONFIG.catalogDir) return false
      return true
    })
    .sort()

  console.log(`找到一级目录: ${topLevelDirs.join(', ')}`)

  const navItems = []

  for (const dirName of topLevelDirs) {
    const fullPath = path.join(docsDir, dirName)

    // 检查是否有手动覆盖
    if (navOverrides[dirName]) {
      navItems.push(navOverrides[dirName])
      console.log(`  ✓ ${dirName} -> [手动配置]`)
      continue
    }

    // 检查是否在排除列表中
    if (CONFIG.excludeDirs.includes(dirName)) {
      console.log(`  - ${dirName} -> 跳过（在排除列表中）`)
      continue
    }

    // 检查是否为空目录
    if (isEmptyDir(fullPath)) {
      console.log(`  - ${dirName} -> 跳过（空目录）`)
      continue
    }

    // 读取目录配置（title、permalink）
    const catalogEntry = readCatalogEntry(catalogDir, dirName)
    const title = catalogEntry?.title || dirName.replace(/^\d+\./, '')
    const permalink = catalogEntry?.permalink || '/' + dirName.toLowerCase().replace(/^\d+\./, '') + '/'

    const item = { text: title, link: permalink }

    // 获取子目录
    const subDirs = getSubdirectories(fullPath)
    if (subDirs.length > 0) {
      item.items = subDirs
        .filter((s) => s.link)
        .map((s) => ({ text: s.displayName, link: s.link }))
    }

    navItems.push(item)
    console.log(`  ✓ ${dirName} -> ${permalink} (${subDirs.length} 个子目录)`)
  }

  return navItems
}

// ============================================================
// 输出格式化
// ============================================================

function generateTsOutput(items) {
  const lines = ['export default [']
  for (const item of items) {
    lines.push(`    { text: '${item.text}', link: '${item.link}'` + (item.items ? ',' : ''))
    if (item.items) {
      lines.push('      items: [')
      for (const sub of item.items) {
        if (sub.items) {
          // 3级菜单
          lines.push(`        {`)
          lines.push(`          text: '${sub.text}',`)
          lines.push(`          link: '${sub.link}',`)
          lines.push(`          items: [`)
          for (const sub2 of sub.items) {
            lines.push(`            { text: '${sub2.text}', link: '${sub2.link}' },`)
          }
          lines.push('          ],')
          lines.push('        },')
        } else {
          // 2级菜单
          lines.push(`        { text: '${sub.text}', link: '${sub.link}' },`)
        }
      }
      lines.push('      ],')
    }
    lines.push('    },')
  }
  lines.push('  ]')
  return lines.join('\n') + '\n'
}

function generateJsOutput(items) {
  return `module.exports = ${JSON.stringify(items, null, 2)};\n`
}

// ============================================================
// 主入口
// ============================================================

function main() {
  const docsDir = process.argv[2] || path.resolve(__dirname, '../docs')

  console.log(`Docs 目录: ${docsDir}`)
  console.log('开始生成导航...\n')

  // 1. 处理首页（特殊 key）
  const navItems = []
  if (navOverrides.__home__) {
    navItems.push(navOverrides.__home__)
  }

  // 2. 生成自动导航
  navItems.push(...generateNavItems(docsDir))

  // 3. 输出
  let output
  if (CONFIG.outputFormat === 'ts') {
    output = generateTsOutput(navItems)
  } else {
    output = generateJsOutput(navItems)
  }

  const commonDir = path.join(docsDir, '.vuepress', 'common')
  if (!fs.existsSync(commonDir)) {
    fs.mkdirSync(commonDir, { recursive: true })
  }

  const outputFile = path.join(commonDir, `nav.${CONFIG.outputFormat}`)
  fs.writeFileSync(outputFile, output, 'utf-8')
  console.log(`\n已生成导航配置: ${outputFile}`)
  console.log(`共 ${navItems.length} 个导航项`)
}

main()
