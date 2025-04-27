const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

/**
 * 提取 Markdown 中所有图片链接
 * 返回：[{ alt, original, path }]
 */
function extractImageLinks(markdownContent) {
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  const matches = [];
  let match;
  while ((match = imageRegex.exec(markdownContent)) !== null) {
    matches.push({
      alt: match[1],
      original: match[0],
      path: match[2],
    });
  }
  return matches;
}

// 动态路径模板解析
function resolveImageOutputDir(template, mdPath, oldRoot, newRoot) {
    const hasTemplate = /\$\{.+?\}/.test(template);
    if (!hasTemplate) return template;
  
    const notepath = path.relative(oldRoot, path.dirname(mdPath)).replace(/\\/g, '/');
    const notename = path.basename(mdPath, path.extname(mdPath));
  
    const resolved = template
      .replace(/\$\{notepath\}/g, notepath)
      .replace(/\$\{notename\}/g, notename)
      .replace(/\$\{oldRoot\}/g, oldRoot.replace(/\\/g, '/'))
      .replace(/\$\{newRoot\}/g, newRoot.replace(/\\/g, '/'));
    return resolved;
}

function resolveImageMarkdownLink({ markdownOutputPath, imageOutputPath }) {
  console.log(markdownOutputPath);
  console.log(imageOutputPath);
  const markdownDir = path.dirname(markdownOutputPath);
  let relative = path.relative(markdownDir, imageOutputPath).replace(/\\/g, '/');
  if (!relative.startsWith('.')) {
      relative = './' + relative;
  }
  return relative;
}

function extractTyporaRootUrl(markdownContent, markdownDir) {
    const match = markdownContent.match(/typora-root-url:\s*(.+)/);
    if (!match) return null;
  
    const raw = match[1].trim().replace(/^['"]|['"]$/g, '');
    const resolved = path.resolve(markdownDir, raw);
    return resolved;
}
  

// 将本地文件复制或远程下载到目标图床，并替换路径
async function processImageLinks(markdownContent, {
    markdownFilePath,
    markdownOutputPath,
    imageOutputDir,
    oldRoot,
    newRoot,
    renameWithHash = true
}) {
    const resolvedImgOutputDir = resolveImageOutputDir(imageOutputDir, markdownFilePath, oldRoot, newRoot);
  
    const imageLinks = extractImageLinks(markdownContent);
    const markdownDir = path.dirname(markdownFilePath);
    const replacements = [];
  
    const typoraRoot = extractTyporaRootUrl(markdownContent, markdownDir);
    let createdOutputDir = false;
    console.log(imageOutputDir);
    console.log(resolvedImgOutputDir);

for (const img of imageLinks) {
  const isRemote = /^https?:\/\//.test(img.path);
  const ext = path.extname(img.path) || '.png';
  const hash = crypto.createHash('md5').update(img.path + Date.now()).digest('hex').slice(0, 8);
  const newFileName = renameWithHash ? `${hash}${ext}` : path.basename(img.path);
  const newImgFilePath = path.join(resolvedImgOutputDir, newFileName);
  console.log(newImgFilePath);

  // 这里改造路径解析逻辑
  let absSource = null;
  let cleanPath = img.path.replace(/^\/+/, '').replace(/^file:\/\//, '');

  if (isRemote) {
    absSource = img.path;
  } else if (/^[a-zA-Z]:[\\/]/.test(img.path)) {
    // 绝对路径 (C:/xxx/xxx.png)
    absSource = img.path;
  } else if (img.path.startsWith('/')) {
    // /开头，相对 typora-root-url
    if (typoraRoot) {
      absSource = path.resolve(typoraRoot, cleanPath);
    } else {
      absSource = path.resolve(markdownDir, cleanPath);
    }
  } else {
    // 普通相对路径
    absSource = path.resolve(markdownDir, cleanPath);
  }

  try {
    if (isRemote) {
      if (!createdOutputDir && !fs.existsSync(resolvedImgOutputDir)) {
        fs.mkdirSync(resolvedImgOutputDir, { recursive: true });
        createdOutputDir = true;
      }
      const response = await axios.get(img.path, { responseType: 'arraybuffer' });
      fs.writeFileSync(newImgFilePath, response.data);
    } else {
      if (fs.existsSync(absSource)) {
        if (!createdOutputDir && !fs.existsSync(resolvedImgOutputDir)) {
          fs.mkdirSync(resolvedImgOutputDir, { recursive: true });
          createdOutputDir = true;
        }
        fs.copyFileSync(absSource, newImgFilePath);
      } else {
        console.warn(`⚠️ 本地图片不存在: ${absSource}`);
        continue;
      }
    }
  
    const newMarkdownLink = resolveImageMarkdownLink({
      markdownOutputPath,
      imageOutputPath: newImgFilePath
    });
    replacements.push({ from: img.original, to: `![${img.alt}](${newMarkdownLink})` });
  
  } catch (err) {
    console.warn(`❌ 图片处理失败: ${img.path} - ${err.message}`);
  }
}
  
    let newMarkdown = markdownContent;
    for (const r of replacements) {
      newMarkdown = newMarkdown.replace(r.from, r.to);
    }
  
    return newMarkdown;
}

module.exports = {
    extractImageLinks,
    processImageLinks,
    resolveImageMarkdownLink,
};