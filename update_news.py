#!/usr/bin/env python3
"""
AI Daily 新闻自动更新脚本
每日抓取最新 AI 资讯并生成 news_data.json

使用方法:
1. 安装依赖: pip install requests beautifulsoup4 feedparser --break-system-packages
2. 设置定时任务（如 cron）每天运行一次
3. 脚本会自动抓取、分类、去重，并输出 JSON 文件
"""

import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import time
import feedparser
import re

# ══════════════════════════════════════════════════════════════
# 配置区
# ══════════════════════════════════════════════════════════════

# RSS 新闻源（真实可靠的 AI 新闻源）
RSS_FEEDS = [
    'https://techcrunch.com/tag/artificial-intelligence/feed/',
    'https://www.technologyreview.com/topic/artificial-intelligence/feed',
    'https://venturebeat.com/category/ai/feed/',
    'https://www.artificialintelligence-news.com/feed/',
]

# 分类关键词映射
CATEGORY_KEYWORDS = {
    'news': ['breakthrough', 'announce', 'launch', 'release', 'trend', 'industry', 'market', 'partnership', 'acquisition'],
    'tools': ['tool', 'platform', 'app', 'software', 'service', 'product', 'chatgpt', 'claude', 'gemini', 'copilot'],
    'research': ['research', 'paper', 'study', 'model', 'algorithm', 'deepmind', 'openai', 'anthropic', 'breakthrough'],
    'industry': ['business', 'investment', 'funding', 'revenue', 'market', 'enterprise', 'startup', 'ipo'],
    'safety': ['safety', 'ethics', 'regulation', 'policy', 'privacy', 'bias', 'risk', 'governance', 'law'],
}

# 热点关键词（包含这些词的会标记为 hot）
HOT_KEYWORDS = ['breakthrough', 'chatgpt', 'openai', 'google', 'microsoft', 'anthropic', 'billion', 'major', 'revolutionary']

OUTPUT_FILE = 'news_data.json'
MAX_ARTICLES = 30  # 每次最多保留的文章数

# ══════════════════════════════════════════════════════════════
# 工具函数
# ══════════════════════════════════════════════════════════════

def clean_text(text):
    """清理文本：移除多余空格、HTML 标签等"""
    if not text:
        return ""
    # 移除 HTML 标签
    text = re.sub(r'<[^>]+>', '', text)
    # 移除多余空格
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def categorize_article(title, summary):
    """根据标题和摘要自动分类文章"""
    text = (title + ' ' + summary).lower()
    
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        scores[cat] = score
    
    # 返回得分最高的分类，默认 news
    if max(scores.values()) == 0:
        return 'news'
    return max(scores, key=scores.get)

def is_hot(title, summary):
    """判断是否为热点新闻"""
    text = (title + ' ' + summary).lower()
    return any(kw in text for kw in HOT_KEYWORDS)

def extract_tags(title, summary):
    """从标题和摘要中提取标签"""
    text = title + ' ' + summary
    tags = []
    
    # 常见 AI 工具/公司名
    entities = ['ChatGPT', 'OpenAI', 'Google', 'Microsoft', 'Anthropic', 'Claude', 
                'DeepMind', 'Meta', 'Apple', 'Amazon', 'Tesla', 'Nvidia']
    for entity in entities:
        if entity.lower() in text.lower():
            tags.append(entity)
    
    # 技术关键词
    tech_keywords = ['机器学习', '深度学习', '大模型', 'LLM', '智能体', 'AGI', 
                     '生成式AI', '计算机视觉', 'NLP', '强化学习']
    for kw in tech_keywords:
        if kw in text:
            tags.append(kw)
    
    return tags[:5]  # 最多返回 5 个标签

# ══════════════════════════════════════════════════════════════
# 核心抓取函数
# ══════════════════════════════════════════════════════════════

def fetch_from_rss(feed_url):
    """从 RSS 源抓取文章"""
    articles = []
    
    try:
        print(f"  正在抓取: {feed_url}")
        feed = feedparser.parse(feed_url)
        
        for entry in feed.entries[:10]:  # 每个源取前 10 条
            title = clean_text(entry.get('title', ''))
            summary = clean_text(entry.get('summary', entry.get('description', '')))
            
            # 限制摘要长度
            if len(summary) > 200:
                summary = summary[:197] + '...'
            
            # 提取发布日期
            pub_date = entry.get('published_parsed') or entry.get('updated_parsed')
            if pub_date:
                date_str = time.strftime('%Y-%m-%d', pub_date)
            else:
                date_str = datetime.now().strftime('%Y-%m-%d')
            
            # 提取来源
            source = feed.feed.get('title', 'Unknown')
            
            # 文章链接
            url = entry.get('link', '#')
            
            if title and summary:
                article = {
                    'title': title,
                    'summary': summary,
                    'source': source,
                    'date': date_str,
                    'url': url,
                    'cat': categorize_article(title, summary),
                    'hot': is_hot(title, summary),
                    'tags': extract_tags(title, summary) or ['AI'],
                }
                articles.append(article)
        
        print(f"    ✓ 成功抓取 {len(articles)} 篇")
        
    except Exception as e:
        print(f"    ✗ 抓取失败: {e}")
    
    return articles

def deduplicate_articles(articles):
    """去重：基于标题相似度"""
    seen_titles = set()
    unique_articles = []
    
    for article in articles:
        # 简单的去重逻辑：标题的前 30 个字符
        title_key = article['title'][:30].lower()
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_articles.append(article)
    
    return unique_articles

def prioritize_articles(articles):
    """优先级排序：热点优先，然后按日期"""
    return sorted(articles, key=lambda x: (not x['hot'], x['date']), reverse=True)

# ══════════════════════════════════════════════════════════════
# 主函数
# ══════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("AI Daily 新闻自动更新脚本")
    print("=" * 60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    all_articles = []
    
    # 1. 从所有 RSS 源抓取
    print("📡 第一步：抓取新闻源")
    for feed_url in RSS_FEEDS:
        articles = fetch_from_rss(feed_url)
        all_articles.extend(articles)
        time.sleep(1)  # 礼貌性延迟
    
    print(f"\n  共抓取 {len(all_articles)} 篇原始文章")
    
    # 2. 去重
    print("\n🔍 第二步：去重处理")
    all_articles = deduplicate_articles(all_articles)
    print(f"  去重后剩余 {len(all_articles)} 篇")
    
    # 3. 排序和截断
    print("\n⭐ 第三步：优先级排序")
    all_articles = prioritize_articles(all_articles)
    all_articles = all_articles[:MAX_ARTICLES]
    print(f"  保留前 {len(all_articles)} 篇")
    
    # 4. 添加 ID
    for i, article in enumerate(all_articles, 1):
        article['id'] = i
    
    # 5. 生成 JSON
    print("\n💾 第四步：保存 JSON 文件")
    output_data = {
        'last_update': datetime.now().isoformat(),
        'total_count': len(all_articles),
        'articles': all_articles
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"  ✓ 已保存至 {OUTPUT_FILE}")
    
    # 6. 统计信息
    print("\n📊 统计信息:")
    print(f"  总文章数: {len(all_articles)}")
    print(f"  热点文章: {sum(1 for a in all_articles if a['hot'])}")
    
    cat_counts = {}
    for article in all_articles:
        cat = article['cat']
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    
    for cat, count in sorted(cat_counts.items()):
        print(f"  {cat}: {count}")
    
    print("\n" + "=" * 60)
    print(f"✅ 更新完成！时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

if __name__ == '__main__':
    main()
