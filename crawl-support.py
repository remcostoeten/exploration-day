import requests
from bs4 import BeautifulSoup
import json
import time
import os

def crawl_zendesk_knowledge_base(start_url):
    """
    Crawl an entire Zendesk knowledge base starting from a category page
    and extract all articles across all subcategories.
    """
    base_url = "https://support.allyoucanlearn.nl"
    visited_urls = set()
    all_data = {"categories": []}
    
    def get_soup(url):
        # Add delay to avoid hitting rate limits
        time.sleep(1)
        response = requests.get(url)
        if response.status_code != 200:
            print(f"Failed to fetch {url}: Status code {response.status_code}")
            return None
        return BeautifulSoup(response.text, 'html.parser')
    
    def crawl_category(category_url):
        if category_url in visited_urls:
            return None
        
        visited_urls.add(category_url)
        print(f"Crawling category: {category_url}")
        
        soup = get_soup(category_url)
        if not soup:
            return None
        
        # Get category title
        category_title = soup.select_one('h1').text.strip() if soup.select_one('h1') else "Unknown Category"
        
        category_data = {
            "title": category_title,
            "url": category_url,
            "subcategories": []
        }
        
        # Find all subcategories (sections)
        subcategories = soup.select('.section-list .section-item')
        
        for subcat in subcategories:
            subcat_link = subcat.select_one('a')
            if not subcat_link:
                continue
                
            subcat_url = subcat_link['href']
            if not subcat_url.startswith('http'):
                subcat_url = base_url + subcat_url
                
            subcat_title = subcat.select_one('.section-name').text.strip()
            
            # Crawl subcategory
            subcat_data = crawl_subcategory(subcat_url, subcat_title)
            if subcat_data:
                category_data["subcategories"].append(subcat_data)
        
        return category_data
    
    def crawl_subcategory(subcategory_url, subcategory_title):
        if subcategory_url in visited_urls:
            return None
            
        visited_urls.add(subcategory_url)
        print(f"Crawling subcategory: {subcategory_url}")
        
        soup = get_soup(subcategory_url)
        if not soup:
            return None
        
        subcategory_data = {
            "title": subcategory_title,
            "url": subcategory_url,
            "articles": []
        }
        
        # Find all articles in this subcategory
        articles = soup.select('.article-list .article-item')
        
        for article in articles:
            article_link = article.select_one('a')
            if not article_link:
                continue
                
            article_url = article_link['href']
            if not article_url.startswith('http'):
                article_url = base_url + article_url
                
            article_title = article_link.text.strip()
            
            # Extract article content
            article_data = extract_article_content(article_url, article_title)
            if article_data:
                subcategory_data["articles"].append(article_data)
        
        # Check for pagination
        next_page = soup.select_one('.pagination-next a')
        if next_page and 'href' in next_page.attrs:
            next_url = next_page['href']
            if not next_url.startswith('http'):
                next_url = base_url + next_url
                
            if next_url not in visited_urls:
                # Crawl next page and merge articles
                soup_next = get_soup(next_url)
                if soup_next:
                    visited_urls.add(next_url)
                    articles_next = soup_next.select('.article-list .article-item')
                    
                    for article in articles_next:
                        article_link = article.select_one('a')
                        if not article_link:
                            continue
                            
                        article_url = article_link['href']
                        if not article_url.startswith('http'):
                            article_url = base_url + article_url
                            
                        article_title = article_link.text.strip()
                        
                        # Extract article content
                        article_data = extract_article_content(article_url, article_title)
                        if article_data:
                            subcategory_data["articles"].append(article_data)
        
        return subcategory_data
    
    def extract_article_content(article_url, article_title):
        if article_url in visited_urls:
            return None
            
        visited_urls.add(article_url)
        print(f"Extracting article: {article_url}")
        
        soup = get_soup(article_url)
        if not soup:
            return None
        
        # The main content is likely in an article element or div with specific class
        content_element = soup.select_one('.article-body')
        if not content_element:
            return {
                "title": article_title,
                "url": article_url,
                "content": "Content could not be extracted"
            }
        
        # Clean up the content - remove unnecessary elements
        for element in content_element.select('.attachments, .related-articles, .article-footer'):
            element.decompose()
        
        # Extract text and preserve some structure
        content = content_element.get_text('\n', strip=True)
        
        return {
            "title": article_title,
            "url": article_url,
            "content": content
        }
    
    # Start the crawling process from the main category
    category_data = crawl_category(start_url)
    if category_data:
        all_data["categories"].append(category_data)
    
    return all_data

# Main execution
if __name__ == "__main__":
    start_url = "https://support.allyoucanlearn.nl/hc/nl/categories/4906127425053-Voor-deelnemers"
    output_file = "aycl_knowledge_base.json"
    
    data = crawl_zendesk_knowledge_base(start_url)
    
    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    
    print(f"Crawling complete. Data saved to {output_file}")
    
    # Print some stats
    total_articles = sum(len(subcategory["articles"]) 
                         for category in data["categories"] 
                         for subcategory in category["subcategories"])
    
    print(f"Total categories: {len(data['categories'])}")
    print(f"Total articles: {total_articles}")
