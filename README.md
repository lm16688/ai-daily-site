# AI Daily 自动更新系统 - 部署指南

## 📦 系统组成

本系统包含三个核心文件：

1. **`ai_daily.html`** - 前端网站（用户访问的页面）
2. **`update_news.py`** - Python 爬虫脚本（每日自动更新数据）
3. **`news_data.json`** - 数据文件（由爬虫生成，网站读取）

## 🚀 部署步骤

### 第一步：环境准备

1. **安装 Python 依赖**
```bash
pip install requests beautifulsoup4 feedparser --break-system-packages
```

2. **创建项目目录**
```bash
mkdir -p /var/www/ai-daily
cd /var/www/ai-daily
```

3. **上传文件**
将以下文件放入项目目录：
- `ai_daily.html`
- `update_news.py`
- 给 Python 脚本添加执行权限：
```bash
chmod +x update_news.py
```

### 第二步：首次运行测试

**手动运行爬虫生成初始数据：**
```bash
python3 update_news.py
```

成功后会看到类似输出：
```
============================================================
AI Daily 新闻自动更新脚本
============================================================
开始时间: 2026-02-05 09:00:00

📡 第一步：抓取新闻源
  正在抓取: https://techcrunch.com/tag/artificial-intelligence/feed/
    ✓ 成功抓取 10 篇
  ...

💾 第四步：保存 JSON 文件
  ✓ 已保存至 news_data.json

✅ 更新完成！
============================================================
```

检查生成的文件：
```bash
ls -lh news_data.json
cat news_data.json | head -20
```

### 第三步：配置自动更新（定时任务）

使用 Linux cron 设置**每天早上 8 点**自动运行爬虫：

```bash
crontab -e
```

添加以下行：
```cron
# AI Daily 每天早上 8:00 自动更新
0 8 * * * /usr/bin/python3 /var/www/ai-daily/update_news.py >> /var/www/ai-daily/update.log 2>&1
```

**其他时间选项：**
- 每天凌晨 2 点：`0 2 * * *`
- 每天中午 12 点：`0 12 * * *`
- 每 6 小时一次：`0 */6 * * *`

保存后查看当前的定时任务：
```bash
crontab -l
```

### 第四步：部署网站

#### 方案 A：直接访问（本地测试）

```bash
cd /var/www/ai-daily
python3 -m http.server 8000
```

然后访问：`http://localhost:8000/ai_daily.html`

#### 方案 B：Nginx 部署（推荐生产环境）

1. **安装 Nginx（如未安装）：**
```bash
sudo apt update
sudo apt install nginx
```

2. **创建 Nginx 配置：**
```bash
sudo nano /etc/nginx/sites-available/ai-daily
```

粘贴以下内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP
    
    root /var/www/ai-daily;
    index ai_daily.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # 允许跨域访问 JSON（如需要）
    location ~* \.json$ {
        add_header Access-Control-Allow-Origin *;
    }
}
```

3. **启用配置并重启 Nginx：**
```bash
sudo ln -s /etc/nginx/sites-available/ai-daily /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **访问网站：**
```
http://your-domain.com
```

#### 方案 C：Apache 部署

1. **安装 Apache（如未安装）：**
```bash
sudo apt install apache2
```

2. **复制文件到 web 目录：**
```bash
sudo cp /var/www/ai-daily/* /var/www/html/
```

3. **重启 Apache：**
```bash
sudo systemctl restart apache2
```

4. **访问网站：**
```
http://your-domain.com/ai_daily.html
```

## 🔧 高级配置

### 自定义新闻源

编辑 `update_news.py` 中的 `RSS_FEEDS` 列表，添加你想要的 RSS 源：

```python
RSS_FEEDS = [
    'https://techcrunch.com/tag/artificial-intelligence/feed/',
    'https://www.technologyreview.com/topic/artificial-intelligence/feed',
    '你的自定义 RSS 源 URL',
]
```

### 调整文章数量

修改 `update_news.py` 中的 `MAX_ARTICLES` 常量：

```python
MAX_ARTICLES = 50  # 默认 30，可改为任意数字
```

### 调整分类规则

修改 `CATEGORY_KEYWORDS` 字典来自定义分类逻辑：

```python
CATEGORY_KEYWORDS = {
    'news': ['breakthrough', 'announce', '你的关键词'],
    'tools': ['tool', 'platform', '你的关键词'],
    # ...
}
```

## 📊 监控和维护

### 查看更新日志

```bash
tail -f /var/www/ai-daily/update.log
```

### 手动触发更新

```bash
cd /var/www/ai-daily
python3 update_news.py
```

### 检查 cron 任务是否运行

```bash
grep CRON /var/log/syslog | grep update_news
```

### 验证 JSON 文件是否更新

```bash
ls -lh /var/www/ai-daily/news_data.json
# 查看最后修改时间，应该是今天早上 8 点左右
```

## 🐛 故障排查

### 问题1：网站显示"加载 news_data.json 失败"

**原因：** JSON 文件不存在或路径错误

**解决：**
```bash
cd /var/www/ai-daily
python3 update_news.py  # 手动生成 JSON
ls -lh news_data.json   # 确认文件存在
```

### 问题2：cron 定时任务没有运行

**检查 cron 服务状态：**
```bash
sudo systemctl status cron
```

**查看 cron 日志：**
```bash
grep CRON /var/log/syslog | tail -20
```

**确保路径是绝对路径：**
```bash
which python3  # 获取 Python 绝对路径
pwd            # 获取当前目录绝对路径
```

### 问题3：爬虫运行报错

**检查依赖：**
```bash
python3 -c "import requests, feedparser, bs4; print('依赖正常')"
```

**手动运行查看详细错误：**
```bash
python3 update_news.py
```

### 问题4：网站无法访问

**检查 Nginx/Apache 状态：**
```bash
sudo systemctl status nginx
# 或
sudo systemctl status apache2
```

**检查防火墙：**
```bash
sudo ufw status
sudo ufw allow 80
```

## 📝 数据格式说明

生成的 `news_data.json` 格式：

```json
{
  "last_update": "2026-02-05T08:00:00",
  "total_count": 30,
  "articles": [
    {
      "id": 1,
      "title": "文章标题",
      "summary": "文章摘要",
      "source": "来源",
      "date": "2026-02-05",
      "url": "https://...",
      "cat": "news",
      "hot": true,
      "tags": ["AI", "ChatGPT"]
    }
  ]
}
```

## 🎯 使用流程总结

1. ⏰ **每天早上 8:00** - cron 自动运行 `update_news.py`
2. 🕷️ **爬虫抓取** - 从多个 RSS 源抓取最新 AI 新闻
3. 🏷️ **自动分类** - 根据关键词自动分类（新闻/工具/研究等）
4. 💾 **生成 JSON** - 输出 `news_data.json` 文件
5. 🌐 **网站读取** - 用户访问时，`ai_daily.html` 从 JSON 加载最新数据
6. 📱 **视频/笔记生成** - 用户点击"生成抖音视频"或"生成小红书笔记"时使用最新数据

## 💡 扩展建议

- **添加更多新闻源**：编辑 `RSS_FEEDS` 列表
- **接入 AI API**：让爬虫使用 LLM 改写摘要或生成标签
- **数据库存储**：将历史数据存入 SQLite/MySQL
- **邮件通知**：每日发送更新摘要到邮箱
- **CDN 加速**：将静态文件托管到 CDN

---

**需要帮助？** 查看日志文件或手动运行脚本以获取详细错误信息。
