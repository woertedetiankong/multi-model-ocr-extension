# Multi-Model OCR Extension

<p align="center">
  <img src="icons/icon128.svg" width="128" height="128" alt="Multi-Model OCR Logo">
</p>

一个强大的浏览器扩展，支持使用Google Gemini和阿里巴巴通义千问模型进行图像文字识别(OCR)。

## 功能特点

- 支持两种强大的OCR API:
  - Google Gemini - 强大的AI文字识别，支持多种语言，可以保留格式输出Markdown
  - 阿里巴巴通义千问 - 专业的OCR能力，对中文和多语言文字具有出色支持
- 灵活的使用方式:
  - 通过快捷键(Ctrl+Shift+X/Command+Shift+X)捕获屏幕区域进行OCR
  - 上传本地图片进行OCR
- 选项设置:
  - 可以在不同OCR提供商之间切换
  - 可以选择模型性能和速度之间的平衡

## 安装说明

### 从Chrome Web Store安装

1. 访问Chrome Web Store上的[Multi-Model OCR Extension页面](#)(待发布)
2. 点击"添加到Chrome"按钮
3. 按照提示完成安装

### 本地开发安装

1. 下载或克隆此仓库到本地
2. 打开Chrome浏览器，访问`chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择包含manifest.json的目录

## 使用指南

### 设置API密钥

在使用扩展之前，您需要设置至少一个API密钥:

1. 点击扩展图标，然后点击"选项"打开设置页面
2. 选择您想使用的OCR提供商
3. 输入相应的API密钥:
   - 对于Google Gemini，从[Google AI Studio](https://aistudio.google.com/apikey)获取密钥
   - 对于通义千问，从[阿里云百炼平台](https://bailian.console.aliyun.com)获取密钥
4. 保存设置

### 使用OCR功能

#### 方法1: 截取屏幕区域

1. 使用快捷键`Ctrl+Shift+X`(Windows/Linux)或`Command+Shift+X`(Mac)
2. 在网页上拖动选择区域
3. 松开鼠标后，扩展会自动处理所选区域
4. 识别结果将在弹出窗口中显示

#### 方法2: 上传图片

1. 点击扩展图标打开弹出窗口
2. 点击"上传图片"按钮
3. 选择要进行OCR的图片
4. 识别结果将在弹出窗口中显示

### 复制结果

识别完成后，可以点击"复制文本"按钮将结果复制到剪贴板。

## 隐私说明

- 您的API密钥安全地存储在浏览器本地，不会被上传到任何服务器
- 图像数据仅在本地处理后发送到您选择的API服务进行OCR
- 我们不会存储您的任何数据
- 详细隐私政策请参阅[privacy_policy.html](privacy_policy.html)

## 发布准备

如果您想将此扩展提交到Chrome Web Store，请按照[PACKAGING_CHECKLIST.md](PACKAGING_CHECKLIST.md)中的步骤进行准备。

## 许可证

此项目采用[MIT许可证](LICENSE)。

## 致谢

- 感谢Google Gemini和阿里巴巴通义千问提供的强大OCR技术
- 感谢所有贡献者和用户的支持

## 联系方式

如有问题或建议，请[联系我们](#)(待添加联系方式)
