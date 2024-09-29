// 显示提示信息
function displayMessage(message) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message';
    messageContainer.textContent = message;
    document.body.appendChild(messageContainer);
}

// 检查浏览器是否支持 Native File System API
if ('showDirectoryPicker' in window) {
    const selectSourceBtn = document.getElementById('selectSourceBtn');
    const selectTargetBtn = document.getElementById('selectTargetBtn');
    const startCopyBtn = document.getElementById('startCopyBtn');
    const sourcePathInput = document.getElementById('sourcePath');
    const targetPathInput = document.getElementById('targetPath');
    const fileListContainer = document.getElementById('fileListContainer');

    let source_folder = null;
    let target_folder = null;

    // 选择源文件夹
    selectSourceBtn.addEventListener('click', async () => {
        try {
            source_folder = await window.showDirectoryPicker();
            sourcePathInput.value = source_folder.name;
        } catch (err) {
            console.error('选择源文件夹时出错:', err);
        }
    });

    // 选择目标文件夹
    selectTargetBtn.addEventListener('click', async () => {
        try {
            target_folder = await window.showDirectoryPicker();
            targetPathInput.value = target_folder.name;
        } catch (err) {
            console.error('选择目标文件夹时出错:', err);
        }
    });

    // 开始复制
    startCopyBtn.addEventListener('click', async () => {
        if (!source_folder || !target_folder) {
            displayMessage('请先选择源文件夹和目标文件夹');
            return;
        }

        try {
            // 创建进度条
            const progressBar = createProgressBar();
            document.body.appendChild(progressBar);

            await processFiles(progressBar);
        } catch (err) {
            console.error('处理文件时出错:', err);
        } finally {
            // 移除进度条
            const progressBar = document.getElementById('progressBar');
            if (progressBar) {
                progressBar.remove();
            }
        }
    });

    // 显示文件列表
    async function displayFileList(folder) {
        const fileList = document.createElement('ul');
        fileList.id = 'sourceFileList';
        
        for await (const entry of folder.values()) {
            const listItem = document.createElement('li');
            listItem.textContent = `${entry.kind}: ${entry.name}`;
            fileList.appendChild(listItem);
        }
        
        fileListContainer.innerHTML = '';
        fileListContainer.appendChild(fileList);
    }

    // 处理文件
    async function processFiles(progressBar) {
        // 在 source_folder 中创建一个名字是 target_folder 名字的文件夹
        let folderInSource;
        try { 
            folderInSource = await target_folder.getDirectoryHandle(source_folder.name, { create: true });
        } catch (err) {
            console.error(`创建文件夹 ${target_folder.name} 时出错:`, err);
            return;
        }

        let totalFiles = 0;
        let processedFiles = 0;

        // 计算总文件数
        for await (const entry of target_folder.values()) {
            if (entry.kind === 'file') {
                totalFiles++;
            }
        }

        for await (const entry of target_folder.values()) {
            if (entry.kind === 'file') {
                const fileName = entry.name.split('.')[0]; // 提取文件名（不包含扩展名）
                const fileExtension = entry.name.split('.').pop(); // 提取文件扩展名
                const matchingFile = await findMatchingFolder(source_folder, fileName, fileExtension);
                
                if (matchingFile) {
                    try {
                        // 更新进度条和当前处理的文件名
                        updateProgressBar(progressBar, ++processedFiles, totalFiles, entry.name);

                        const fileHandle = await source_folder.getFileHandle(matchingFile.name);
                        await copyFile(fileHandle, folderInSource, matchingFile.name);
                        console.log(`文件 ${entry.name} 已移动到 ${target_folder.name}`);
                    } catch (err) {
                        console.error(`移动文件 ${matchingFile.name} 时出错:`, err);
                    }
                } else {
                    console.log(`未找到匹配的文件: ${fileName}`);
                }
            }
        }
        alert('文件处理完成');
    }
    // 查找匹配的文件夹
    async function findMatchingFolder(folder, fileName, fileExtension) {
        for await (const entry of folder.values()) {
            if (entry.kind === 'file' && entry.name.split('.')[0] === fileName ) {
                return entry;
            }
        }
        return null;
    }

    // 移动文件
    async function copyFile(fileHandle, targetFolder, fileName) {
        const file = await fileHandle.getFile();
        const newFileHandle = await targetFolder.getFileHandle(fileName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(file);
        await writable.close();
    }

    // 创建进度条
    function createProgressBar() {
        const progressBarContainer = document.createElement('div');
        progressBarContainer.id = 'progressBar';
        progressBarContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            height: 50px;
            background-color: #f0f0f0;
            border-radius: 5px;
            overflow: hidden;
        `;

        const progressBarFill = document.createElement('div');
        progressBarFill.style.cssText = `
            width: 0%;
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.3s ease-in-out;
        `;

        const progressText = document.createElement('div');
        progressText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #000;
            font-weight: bold;
        `;

        progressBarContainer.appendChild(progressBarFill);
        progressBarContainer.appendChild(progressText);

        return progressBarContainer;
    }

    // 更新进度条
    function updateProgressBar(progressBar, current, total, fileName) {
        const percentage = (current / total) * 100;
        const progressBarFill = progressBar.firstChild;
        const progressText = progressBar.lastChild;

        progressBarFill.style.width = `${percentage}%`;
        progressText.textContent = `处理中: ${fileName} (${current}/${total})`;
    }

} else {
    displayMessage('您的浏览器不支持 Native File System API，无法使用此功能。');
}