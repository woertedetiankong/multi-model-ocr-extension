# GitHub发布指南

以下是将此项目发布到GitHub的步骤说明：

## 1. 创建GitHub账户

如果你还没有GitHub账户，请先在[GitHub网站](https://github.com/)注册一个账户。

## 2. 创建新仓库

1. 登录GitHub后，点击右上角的"+"图标，选择"New repository"
2. 填写仓库信息：
   - Repository name: `multi-model-ocr-extension` (或你喜欢的名称)
   - Description: `A Chrome extension for OCR using Google Gemini and Alibaba Qwen models`
   - 选择"Public"（如果你想让其他人看到你的项目）
   - 不要勾选"Initialize this repository with a README"，因为我们已经有了README文件
3. 点击"Create repository"按钮

## 3. 本地初始化Git仓库

在你的本地计算机上（包含这个项目文件的文件夹中），打开命令行工具（如CMD、PowerShell或Terminal），然后执行以下命令：

```bash
# 进入项目目录
cd D:/mcp/mcp_file/google/gemini-ocr-extension

# 初始化Git仓库
git init

# 添加所有文件到暂存区
git add .

# 提交第一个版本
git commit -m "Initial commit"
```

## 4. 连接到GitHub仓库

```bash
# 添加远程仓库地址（替换YOUR_USERNAME为你的GitHub用户名）
git remote add origin https://github.com/YOUR_USERNAME/multi-model-ocr-extension.git

# 推送代码到GitHub
git push -u origin master
```

如果你使用的是GitHub的默认分支名"main"而不是"master"，请使用：

```bash
git push -u origin main
```

## 5. 验证发布结果

1. 刷新你的GitHub仓库页面
2. 确认所有文件都已正确上传
3. 检查README.md是否正确显示
4. 检查项目结构是否完整

## 常见问题解决

### 如果你在推送时遇到权限问题：

- 确保你已经使用正确的GitHub账户凭据
- 如果启用了双重验证，你可能需要使用个人访问令牌(PAT)而不是密码
- 创建PAT：GitHub -> Settings -> Developer settings -> Personal access tokens -> Generate new token

### 如果你遇到冲突问题：

```bash
# 先拉取远程仓库的更改
git pull origin master --allow-unrelated-histories

# 解决冲突后，再次提交和推送
git add .
git commit -m "Merge and resolve conflicts"
git push origin master
```

## 后续维护

发布成功后，你可以通过以下方式维护仓库：

1. 对于新的更改：
   ```bash
   git add .
   git commit -m "你的更新说明"
   git push origin master
   ```

2. 创建发布版本：
   - 在GitHub仓库页面，点击"Releases" -> "Create a new release"
   - 填写版本号（如v1.0.0）和发布说明
   - 可以上传打包好的扩展ZIP文件作为附件

## 其他建议

- 定期更新CHANGELOG.md记录版本变化
- 使用Issues功能跟踪问题和功能请求
- 考虑启用GitHub Actions进行自动测试和构建
