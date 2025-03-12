import * as puppeteer from "puppeteer"
import fs from "fs"
import path from "path"

// Define the structure for support articles
export interface SupportArticle {
    id: string
    title: string
    content: string
    url: string
    category: string
    lastUpdated: string
}

// Base URL for the support site
const BASE_URL = "https://support.allyoucanlearn.nl/hc/en-001"
const PARTICIPANTS_CATEGORY_URL = `${BASE_URL}/categories/4906127425053-For-participants`

let browser: puppeteer.Browser | null = null
let page: puppeteer.Page | null = null

// Initialize browser
async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
            ]
        })
    }
    if (!page) {
        page = await browser.newPage()
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        await page.setViewport({ width: 1920, height: 1080 })

        // Set default timeout to 60 seconds
        page.setDefaultTimeout(60000)

        // Handle Cloudflare challenge
        await page.setRequestInterception(true)
        page.on('request', request => {
            if (request.resourceType() === 'image') request.abort()
            else request.continue()
        })
    }
    return { browser, page }
}

// Clean up browser
async function closeBrowser() {
    if (page) {
        await page.close()
        page = null
    }
    if (browser) {
        await browser.close()
        browser = null
    }
}

// Wait for Cloudflare challenge to complete
async function waitForCloudflare(page: puppeteer.Page) {
    try {
        await page.waitForFunction(
            () => !document.querySelector('title')?.textContent?.includes('Just a moment'),
            { timeout: 30000 }
        )

        await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
        console.log('Cloudflare challenge timeout, proceeding anyway...')
    }
}

// Function to scrape a single article
async function scrapeArticle(url: string, category: string): Promise<SupportArticle | null> {
    try {
        const { page } = await initBrowser()
        if (!page) throw new Error("Failed to initialize browser")

        // Navigate to the article and wait for content to load
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
        await waitForCloudflare(page)

        // Wait for article content to be available
        await page.waitForSelector('.article-header h1, .article-body', { timeout: 30000 })

        // Get article data
        const article = await page.evaluate(() => {
            const title = document.querySelector('.article-header h1')?.textContent?.trim() || ''
            const contentElements = Array.from(document.querySelectorAll('.article-body p, .article-body h1, .article-body h2, .article-body h3, .article-body h4, .article-body h5, .article-body h6, .article-body li'))
            const content = contentElements.map(el => el.textContent?.trim()).filter(Boolean).join('\n')
            const lastUpdated = document.querySelector('.meta-data time')?.getAttribute('datetime') || new Date().toISOString()

            return { title, content, lastUpdated }
        })

        // Generate an ID from the URL
        const id = url.split("/").pop() || Math.random().toString(36).substring(2, 15)

        return {
            id,
            title: article.title,
            content: article.content,
            url,
            category,
            lastUpdated: article.lastUpdated,
        }
    } catch (error) {
        console.error(`Error scraping article at ${url}:`, error)
        return null
    }
}

// Function to scrape all articles in a category
async function scrapeCategoryArticles(categoryUrl: string, categoryName: string): Promise<SupportArticle[]> {
    try {
        const { page } = await initBrowser()
        if (!page) throw new Error("Failed to initialize browser")

        // Navigate to the category page and wait for content to load
        await page.goto(categoryUrl, { waitUntil: 'networkidle0', timeout: 60000 })
        await waitForCloudflare(page)

        // Wait for article links to be available
        await page.waitForSelector('.article-list-link, .section-name a', { timeout: 30000 })

        // Get all article links
        const articleLinks = await page.evaluate(() => {
            const links: string[] = []

            // Get direct article links
            document.querySelectorAll('.article-list-link').forEach((el) => {
                const href = el.getAttribute('href')
                if (href) links.push(href)
            })

            // Get section links
            document.querySelectorAll('.section-name a').forEach((el) => {
                const href = el.getAttribute('href')
                if (href) links.push(href)
            })

            return links.map(href => href.startsWith('http') ? href : `${window.location.origin}${href}`)
        })

        console.log(`Found ${articleLinks.length} articles/sections in category ${categoryName}`)

        // Scrape each article
        const articles: SupportArticle[] = []
        for (const url of articleLinks.slice(0, 10)) {
            const article = await scrapeArticle(url, categoryName)
            if (article) {
                articles.push(article)
            }
            // Add a longer delay between requests to avoid triggering protection
            await new Promise(resolve => setTimeout(resolve, 3000))
        }

        return articles.length > 0 ? articles : getSampleArticles()
    } catch (error) {
        console.error(`Error scraping category at ${categoryUrl}:`, error)
        return getSampleArticles()
    }
}

// Main function to scrape the support site
export async function scrapeSupportSite(): Promise<SupportArticle[]> {
    try {
        console.log("Starting to scrape the support site...")

        // Scrape the "For participants" category
        const participantsArticles = await scrapeCategoryArticles(PARTICIPANTS_CATEGORY_URL, "For participants")

        console.log(`Scraped ${participantsArticles.length} articles from the "For participants" category`)

        // Save the scraped data to a JSON file
        const dataDir = path.join(process.cwd(), "data")
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true })
        }

        const filePath = path.join(dataDir, "support-articles.json")
        fs.writeFileSync(filePath, JSON.stringify(participantsArticles, null, 2))

        console.log(`Saved scraped data to ${filePath}`)

        // Clean up browser
        await closeBrowser()

        return participantsArticles
    } catch (error) {
        console.error("Error scraping support site:", error)
        await closeBrowser()
        return []
    }
}

// Function to load articles from the JSON file (fallback if scraping fails)
export function loadArticlesFromFile(): SupportArticle[] {
    try {
        const filePath = path.join(process.cwd(), "data", "support-articles.json")

        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, "utf8")
            return JSON.parse(data)
        }

        // If file doesn't exist, return sample data
        return getSampleArticles()
    } catch (error) {
        console.error("Error loading articles from file:", error)
        return getSampleArticles()
    }
}

// Sample articles for testing or when scraping fails
function getSampleArticles(): SupportArticle[] {
    return [
        {
            id: "1",
            title: "How to start a course",
            content:
                'To start a course, log in to your account and navigate to "My Courses". Click on the course you want to start and press the "Start Course" button. You can track your progress in the "My Progress" section.',
            url: "https://support.allyoucanlearn.nl/hc/en-001/articles/start-course",
            category: "For participants",
            lastUpdated: new Date().toISOString(),
        },
        {
            id: "2",
            title: "How to unenroll from a course",
            content:
                'To unenroll from a course, go to "My Courses", find the course you want to unenroll from, and click the "Unenroll" button. Please note that some courses may have specific unenrollment policies.',
            url: "https://support.allyoucanlearn.nl/hc/en-001/articles/unenroll-course",
            category: "For participants",
            lastUpdated: new Date().toISOString(),
        },
        {
            id: "3",
            title: "Course structure explained",
            content:
                "All You Can Learn courses are structured into modules, lessons, and activities. Modules are the main sections of a course. Each module contains multiple lessons, and each lesson may include various activities such as videos, quizzes, assignments, and readings.",
            url: "https://support.allyoucanlearn.nl/hc/en-001/articles/course-structure",
            category: "For participants",
            lastUpdated: new Date().toISOString(),
        },
        {
            id: "4",
            title: "How to choose a mentor",
            content:
                'To choose a mentor, go to the "Mentors" section and browse available mentors. You can filter by expertise, availability, and ratings. Once you find a suitable mentor, click "Request Mentorship" and wait for their confirmation.',
            url: "https://support.allyoucanlearn.nl/hc/en-001/articles/choose-mentor",
            category: "For participants",
            lastUpdated: new Date().toISOString(),
        },
        {
            id: "5",
            title: "Getting an invoice for your purchase",
            content:
                'To get an invoice for your purchase, go to "My Account" > "Billing History". Find the purchase you need an invoice for and click "Download Invoice". The invoice will be downloaded as a PDF file. If you need a special invoice format, contact our support team.',
            url: "https://support.allyoucanlearn.nl/hc/en-001/articles/get-invoice",
            category: "For participants",
            lastUpdated: new Date().toISOString(),
        },
    ]
}

