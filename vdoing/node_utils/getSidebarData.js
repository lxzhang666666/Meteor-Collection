const fs = require('fs'); // 文件模块
const path = require('path'); // 路径模块
const chalk = require('chalk') // 命令行打印美化
const matter = require('gray-matter'); // front matter解析器
const log = console.log

let catalogueData = {}; // 目录页数据

/**
 * 生成侧边栏数据
 * @param {String} sourceDir .md文件所在源目录(一般是docs目录)
 * @param {Boolean} collapsable  是否可折叠
 */
function createSidebarData(sourceDir, collapsable) {
  const sidebarData = {};
  const tocs = readTocs(sourceDir);
  tocs.forEach(toc => { // toc是每个目录的绝对路径

    if (toc.substr(-6) === '_posts') { // 碎片化文章

      // 注释说明：碎片化文章不需要生成结构化侧边栏 2020.05.01
      // const sidebarArr = mapTocToPostSidebar(toc);
      // sidebarData[`/${path.basename(toc)}/`] = sidebarArr

    } else {
      const sidebarObj = mapTocToSidebar(toc, collapsable);
      if (!sidebarObj.sidebar.length) {
        log(chalk.yellow(`warning: 该目录 "${toc}" 内部没有任何文件或文件序号出错，将忽略生成对应侧边栏`))
        return;
      }
      sidebarData[`/${path.basename(toc)}/`] = sidebarObj.sidebar
      sidebarData.catalogue = sidebarObj.catalogueData
    }
  })

  return sidebarData
}

module.exports = createSidebarData;


/**
 * 读取指定目录下的文件绝对路径
 * @param {String} root 指定的目录
*/
function readTocs(root) {
  const result = [];
  const files = fs.readdirSync(root); // 读取目录,返回数组，成员是root底下所有的目录名 (包含文件夹和文件)
  files.forEach(name => {
    const file = path.resolve(root, name); // 将路径或路径片段的序列解析为绝对路径
    if (fs.statSync(file).isDirectory() && name !== '.vuepress' && name !== '@pages' && name !== 'assets') { // 是否为文件夹目录，并排除.vuepress文件夹和assets文件夹
      result.push(file);
    }
  })
  return result;
}


/**
 * 将碎片化文章目录(_posts)映射为对应的侧边栏配置数据
 * @param {String} root
 */
function mapTocToPostSidebar(root) {
  let postSidebar = [] // 碎片化文章数据
  const files = fs.readdirSync(root); // 读取目录（文件和文件夹）,返回数组

  files.forEach(filename => {
    const file = path.resolve(root, filename); // 方法：将路径或路径片段的序列解析为绝对路径
    const stat = fs.statSync(file); // 文件信息

    const fileNameArr = filename.split('.');
    if (fileNameArr.length > 2) {
      log(chalk.yellow(`warning: 该文件 "${file}" 在_posts文件夹中，不应有序号，且文件名中间不应有'.'`))
      return
    }
    if (stat.isDirectory()) { // 是文件夹目录
      // log(chalk.yellow(`warning: 该目录 "${file}" 内文件无法生成侧边栏，_posts文件夹里面不能有二级目录。`))
      return
    }

    let [title, type] = filename.split('.');
    if (type !== 'md') {
      log(chalk.yellow(`warning: 该文件 "${file}" 非.md格式文件，不支持该文件类型`))
      return;
    }

    const contentStr = fs.readFileSync(file, 'utf8') // 读取md文件内容，返回字符串
    const { data } = matter(contentStr, {}) // 解析出front matter数据
    const { permalink = '', titleTag = '' } = data || {}
    if (data.title) {
      title = data.title
    }
    const item = [filename, title, permalink]
    if (titleTag) {
      item.push(titleTag)
    }
    postSidebar.push(item);  // [<路径>, <标题>, <永久链接>, <?标题标签>]
  })

  return postSidebar
}


/**
 * 将目录映射为对应的侧边栏配置数据
 * @param {String} root
 * @param {Boolean} collapsable
 * @param {String} prefix
 */

function mapTocToSidebar(root, collapsable, prefix = '') {
  let sidebar = []; // 结构化文章侧边栏数据
  const files = fs.readdirSync(root); // 读取目录（文件和文件夹）,返回数组

  // 收集有有效序号和无效序号的条目
  let orderedItems = [];
  let unorderedItems = [];

  files.forEach(filename => {
    const file = path.resolve(root, filename); // 方法：将路径或路径片段的序列解析为绝对路径
    const stat = fs.statSync(file); // 文件信息
    if (filename === '.DS_Store') { // 过滤.DS_Store文件
      return
    }
    if (filename === 'assets') { // 过滤assets文件夹
      return
    }

    const fileNameArr = filename.split('.')
    const isDir = stat.isDirectory()
    let order = '', title = '', type = '';
    if (isDir) {
      // 目录：取最后一个点之后的部分作为"类型"（用于提取标题），但实际不用于类型判断
      const firstDotIndex = filename.indexOf('.');
      title = firstDotIndex > 0 ? filename.substring(firstDotIndex + 1) : filename;
    } else {
      // 文件：用 lastIndexOf 正确提取扩展名
      const lastDotIndex = filename.lastIndexOf('.');
      if (lastDotIndex <= 0) {
        // 没有扩展名或第一个字符就是点
        log(chalk.yellow(`warning: 该文件 "${file}" 没有有效的扩展名`))
        return;
      }
      type = filename.substring(lastDotIndex + 1);
      // 标题：去掉最后一个点之后的扩展名
      title = filename.substring(0, lastDotIndex);
    }

    // 提取序号：从文件名开头到第一个点之间的部分
    const firstDotIndex = filename.indexOf('.');
    if (firstDotIndex > 0) {
      order = filename.substring(0, firstDotIndex);
    } else {
      order = '';
    }
    const hasOrder = order !== '' && !isNaN(order) && order >= 0;

    // 构建完整路径前缀
    const fullPath = prefix + filename;

    if (isDir) { // 是文件夹目录
      const item = {
        type: 'group', // 标记为分组类型，使SidebarLinks正确识别
        title,
        collapsable, // 是否可折叠，默认true
        children: mapTocToSidebar(file, collapsable, fullPath + '/').sidebar
      };
      if (hasOrder) {
        orderedItems.push({ order, item, type: 'dir' });
      } else {
        unorderedItems.push({ title: filename.toLowerCase(), item, type: 'dir' });
      }
    } else { // 是文件
      if (type !== 'md') {
        log(chalk.yellow(`warning: 该文件 "${file}" 非.md格式文件，不支持该文件类型`))
        return;
      }
      const contentStr = fs.readFileSync(file, 'utf8') // 读取md文件内容，返回字符串
      const { data } = matter(contentStr, {}) // 解析出front matter数据
      const { permalink = '', titleTag = '' } = data || {}

      // 目录页对应的永久链接，用于给面包屑提供链接
      const { pageComponent } = data
      if (pageComponent && pageComponent.name === "Catalogue") {
        // 优先使用frontmatter中的title，其次用文件名提取的title
        catalogueData[data.title || title] = permalink
      }

      if (data.title) {
        title = data.title
      }
      const item = [fullPath, title, permalink]
      if (titleTag) item.push(titleTag)
      if (hasOrder) {
        orderedItems.push({ order, item, type: 'file' });
      } else {
        unorderedItems.push({ title: filename.toLowerCase(), item, type: 'file' });
      }
    }
  })

  // 有效序号的项目按序号排序
  orderedItems.sort((a, b) => a.order - b.order);
  // 无效序号的项目按名称字母顺序排序
  unorderedItems.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

  // 合并：先有序号的项目，再有无序号的项目
  orderedItems.forEach(i => sidebar.push(i.item));
  unorderedItems.forEach(i => sidebar.push(i.item));

  return {
    sidebar,
    catalogueData
  };
}
