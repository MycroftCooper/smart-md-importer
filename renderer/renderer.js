const fs = window.api.fs;
const path = window.api.path;
const ipcRenderer = window.api.ipcRenderer;
const mergeMarkdownWithTemplate = window.api.mergeMarkdownWithTemplate;

//#region 选项卡切换逻辑
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    tabContents.forEach(tc => {
      tc.classList.remove('active');
      if (tc.id === `tab-${tabName}`) {
        tc.classList.add('active');
      }
    });
  });
});
//#endregion


//#region 单个导入页逻辑
function validateMarkdownPath(path, showMsgId) {
  const el = document.getElementById(showMsgId);
  if (!path || !fs.existsSync(path)) {
    el.innerText = '❌ 路径不存在';
    el.style.color = 'red';
    return false;
  }
  if (!path.toLowerCase().endsWith('.md')) {
    el.innerText = '❌ 请选择 .md 文件';
    el.style.color = 'red';
    return false;
  }
  el.innerText = `✅ ${path}`;
  el.style.color = 'green';
  return true;
}

function validateDirectoryPath(path, showMsgId) {
    const el = document.getElementById(showMsgId);
  
    if (!path || !fs.existsSync(path) || !window.api.utils.isValidDirectory(path)) {
      el.innerText = '❌ 无效的目录路径';
      el.style.color = 'red';
      return false;
    }
  
    el.innerText = `✅ ${path}`;
    el.style.color = 'green';
    return true;
}
  
  

// 监听按钮事件
document.getElementById('select-md').addEventListener('click', async () => {
  const paths = await window.api.ipc.invoke('select-md-file');
  if (paths?.[0]) {
    document.getElementById('md-input').value = paths[0];
    validateMarkdownPath(paths[0], 'md-path-msg');
  }
});

document.getElementById('select-dir').addEventListener('click', async () => {
  const dir = await window.api.ipc.invoke('select-directory');
  if (dir) {
    document.getElementById('dir-input').value = dir;
    validateDirectoryPath(dir, 'dir-path-msg');
  }
});

// 监听输入框变动校验
document.getElementById('md-input').addEventListener('blur', () => {
  const path = document.getElementById('md-input').value;
  validateMarkdownPath(path, 'md-path-msg');
});

document.getElementById('dir-input').addEventListener('blur', () => {
  const path = document.getElementById('dir-input').value;
  validateDirectoryPath(path, 'dir-path-msg');
});

document.getElementById('select-yaml').addEventListener('click', async () => {
    const paths = await window.api.ipc.invoke('select-yaml-file');
    if (paths?.[0]) {
      document.getElementById('yaml-input').value = paths[0];
      validateYamlTemplate(paths[0]);
    }
  });
  
  document.getElementById('yaml-input').addEventListener('blur', () => {
    const path = document.getElementById('yaml-input').value;
    validateYamlTemplate(path);
  });
  
  function validateYamlTemplate(path) {
    const el = document.getElementById('yaml-msg');
    const previewEl = document.getElementById('yaml-preview');
  
    if (!path || !fs.existsSync(path)) {
      el.innerText = '❌ 路径不存在';
      el.style.color = 'red';
      previewEl.value = '';
      return false;
    }
  
    const content = fs.readFileSync(path, 'utf-8');
    previewEl.value = content;
  
    const hasYamlBlock = content.trim().startsWith('---') && content.includes('\n---', 3);
    if (!hasYamlBlock) {
      el.innerText = '❌ 模板内容不合法：缺少 YAML Front Matter（--- 块）';
      el.style.color = 'red';
      return false;
    }
  
    el.innerText = `✅ 模板有效：${path}`;
    el.style.color = 'green';
    return true;
}
  

// 执行导入
document.getElementById('start-import').addEventListener('click', async () => {
    const mdPath = document.getElementById('md-input').value.trim();
    const outputDir = document.getElementById('dir-input').value.trim();
    const statusEl = document.getElementById('import-status');

    const config = window.api.configAPI.loadConfig();
    const yamlPath = config.yamlPath;
    const imageDir = config.imageDir;
    const oldRoot = config.oldRoot;
    const newRoot = config.newRoot;
  
    if (!validateMarkdownPath(mdPath, 'md-path-msg')) return;
    if (!validateYamlTemplate(yamlPath)) return;
    if (!validateDirectoryPath(outputDir, 'dir-path-msg')) return;
  
    try {
      // 1. 读取原 Markdown 内容
      const rawMd = fs.readFileSync(mdPath, 'utf-8');
  
      // 2. 执行图片处理并替换图片路径
      const fileName = path.basename(mdPath);
      const outputPath = path.join(outputDir, fileName);
      const processedMd = await window.api.processImageLinks(rawMd, {
        markdownFilePath: mdPath,
        markdownOutputPath: outputPath,
        imageOutputDir: imageDir,
        oldRoot: oldRoot,
        newRoot: newRoot,
        renameWithHash: true
      });
  
      // 3. 合并 YAML 模板
      const finalMd = window.api.mergeMarkdownWithTemplate(
        processedMd, yamlPath, true
      );
  
      // 4. 写入新 Markdown 文件
      fs.writeFileSync(outputPath, finalMd, 'utf-8');
  
      statusEl.innerText = `✅ 导入成功：${outputPath}`;
      statusEl.style.color = 'green';
    } catch (err) {
      statusEl.innerText = `❌ 导入失败：${err.message}`;
      statusEl.style.color = 'red';
      console.error(err);
    }
});
//#endregion

//#region 批量导入页逻辑
// 选择批量源目录
document.getElementById('select-batch-folder').addEventListener('click', async () => {
    const dir = await window.api.ipc.invoke('select-directory');
    if (dir) {
      document.getElementById('batch-folder-input').value = dir;
      document.getElementById('batch-folder-msg').innerText = `✅ 已选择: ${dir}`;
      document.getElementById('batch-folder-msg').style.color = 'green';
    }
  });
  
  // 选择批量输出目录
  document.getElementById('select-batch-output').addEventListener('click', async () => {
    const dir = await window.api.ipc.invoke('select-directory');
    if (dir) {
      document.getElementById('batch-output-folder').value = dir;
      document.getElementById('batch-output-msg').innerText = `✅ 已选择: ${dir}`;
      document.getElementById('batch-output-msg').style.color = 'green';
    }
  });

  document.getElementById('start-batch-import').addEventListener('click', async () => {
    const srcDir = document.getElementById('batch-folder-input').value.trim();
    const outDir = document.getElementById('batch-output-folder').value.trim();
    const logArea = document.getElementById('batch-log');
  
    if (!srcDir || !fs.existsSync(srcDir)) {
      alert('请选择正确的源目录！');
      return;
    }
    if (!outDir || !fs.existsSync(outDir)) {
      alert('请选择正确的导出目录！');
      return;
    }
  

    const config = window.api.configAPI.loadConfig();
    const yamlPath = config.yamlPath;
    const imageDir = config.imageDir;
    const oldRoot = config.oldRoot;
    const newRoot = config.newRoot;
  
    // 扫描源目录下所有 md 文件
    const allFiles = fs.readdirSync(srcDir);
    const mdFiles = allFiles.filter(fileName => fileName.toLowerCase().endsWith('.md'));
  
    if (mdFiles.length === 0) {
      alert('源目录下没有找到任何 Markdown 文件！');
      return;
    }
  
    logArea.value = '';
    let successCount = 0;
    let failCount = 0;
  
    for (const fileName of mdFiles) {
        const mdPath = path.join(srcDir, fileName);
        try {
          const rawMd = fs.readFileSync(mdPath, 'utf-8');
          const outputPath = path.join(outDir, fileName);
          // ✅ 调用图片处理
          const processedMd = await window.api.processImageLinks(rawMd, {
            markdownFilePath: mdPath,
            markdownOutputPath: outputPath,
            imageOutputDir: imageDir,
            oldRoot: oldRoot,
            newRoot: newRoot,
            renameWithHash: true
          });
      
          const finalMd = window.api.mergeMarkdownWithTemplate(
            processedMd, yamlPath, true
          );

          fs.writeFileSync(outputPath, finalMd, 'utf-8');
      
          logArea.value += `✅ ${fileName} 导入成功\n`;
          successCount++;
        } catch (err) {
          console.error(err);
          logArea.value += `❌ ${fileName} 导入失败: ${err.message}\n`;
          failCount++;
        }
      }
  
    logArea.value += `\n🎯 完成！成功: ${successCount}，失败: ${failCount}\n`;
    logArea.scrollTop = logArea.scrollHeight; // 自动滚到最下面
  });
//#endregion

//#region 配置页逻辑
document.getElementById('select-old-root').addEventListener('click', async () => {
    const selected = await window.api.ipc.invoke('select-directory');
    if (selected) {
      document.getElementById('old-root-input').value = selected;
    }
});
  
document.getElementById('select-new-root').addEventListener('click', async () => {
    const selected = await window.api.ipc.invoke('select-directory');
    if (selected) {
      document.getElementById('new-root-input').value = selected;
    }
});

document.getElementById('save-config').addEventListener('click', () => {
    const yamlPath = document.getElementById('yaml-input').value.trim();
    const imgDir = document.getElementById('img-dir-input').value.trim();
    const oldRoot = document.getElementById('old-root-input').value.trim();
    const newRoot = document.getElementById('new-root-input').value.trim();
  
    window.api.configAPI.saveConfig({
      yamlPath,
      imageDir: imgDir,
      oldRoot,
      newRoot,
    });
  
    const statusEl = document.getElementById('config-status');
    statusEl.innerText = '✅ 配置已保存到 import-config.json';
    statusEl.style.color = 'green';
});
  
document.getElementById('load-config').addEventListener('click', () => {
    const config = window.api.configAPI.loadConfig();
  
    const statusEl = document.getElementById('config-status');
    if (!config) {
      statusEl.innerText = '⚠️ 未找到配置文件';
      statusEl.style.color = 'red';
      return;
    }
  
    document.getElementById('yaml-input').value = config.yamlPath || '';
    document.getElementById('img-dir-input').value = config.imageDir || '';
    document.getElementById('old-root-input').value = config.oldRoot || '';
    document.getElementById('new-root-input').value = config.newRoot || '';
  
    validateYamlTemplate(config.yamlPath || '');
  
    statusEl.innerText = '✅ 配置已加载';
    statusEl.style.color = 'green';
});
  
window.addEventListener('DOMContentLoaded', () => {
    const config = window.api.configAPI.loadConfig();
    if (!config) return;
  
    document.getElementById('yaml-input').value = config.yamlPath || '';
    document.getElementById('img-dir-input').value = config.imageDir || '';
    document.getElementById('old-root-input').value = config.oldRoot || '';
    document.getElementById('new-root-input').value = config.newRoot || '';
  
    validateYamlTemplate(config.yamlPath || '');
  
    const statusEl = document.getElementById('config-status');
    statusEl.innerText = '✅ 配置自动加载完成';
    statusEl.style.color = 'green';
});
//#endregion