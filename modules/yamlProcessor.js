const fs = require('fs');
const path = require('path');

/**
 * 判断文本中是否包含 YAML front matter
 */
function extractYamlBlock(content) {
  if (!content.startsWith('---')) return { yaml: '', body: content };

  const lines = content.split('\n');
  let yamlEndIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      yamlEndIndex = i;
      break;
    }
  }

  if (yamlEndIndex === -1) return { yaml: '', body: content };

  const yaml = lines.slice(0, yamlEndIndex + 1).join('\n');
  const body = lines.slice(yamlEndIndex + 1).join('\n');
  return { yaml, body };
}

/**
 * 合并 YAML 模板和 Markdown 正文
 * @param {string} markdownContent Markdown文件内容（注意：是文本内容，不是文件路径）
 * @param {string} yamlTemplatePath 模板文件路径
 * @param {boolean} removeOldYaml 是否移除原文件中的 YAML 区块
 * @returns {string} 合并后的 Markdown 文本
 */
function mergeMarkdownWithTemplate(markdownContent, yamlTemplatePath, removeOldYaml = true) {
  if (typeof markdownContent !== 'string') {
    throw new Error('mergeMarkdownWithTemplate expects markdownContent to be a string');
  }
  if (!fs.existsSync(yamlTemplatePath)) {
    throw new Error(`模板文件不存在: ${yamlTemplatePath}`);
  }

  const rawTemplate = fs.readFileSync(yamlTemplatePath, 'utf-8');

  const { yaml: oldYaml, body: mdBody } = extractYamlBlock(markdownContent);
  const { yaml: newYaml } = extractYamlBlock(rawTemplate);

  const result = [];

  if (newYaml) {
    result.push(newYaml);
  } else {
    result.push('---\n'); // fallback 生成空头
    result.push('---\n');
  }

  result.push('\n');
  result.push(removeOldYaml ? mdBody.trimStart() : markdownContent.trimStart());

  return result.join('\n').trim() + '\n';
}

module.exports = {
  mergeMarkdownWithTemplate
};
