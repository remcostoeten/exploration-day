import * as fs from "fs"
import * as path from "path"
import * as cheerio from "cheerio"
import { v4 as uuidv4 } from "uuid"

export interface SupportArticle {
    id: string
    title: string
    content: string
    url: string
    category: string
    lastUpdated: string
}

/**
 * Extracts article data from HTML content
 * @param html The HTML content to parse
 * @param sourceUrl Optional source URL for the content
 * @param category Optional category for the article
 * @returns A SupportArticle object
 */
function extractArticleFromHtml(
    html: string,
    sourceUrl = "https://support.allyoucanlearn.nl",
    category = "For participants",
): SupportArticle {
    const $ = cheerio.load(html)

    // Try different selectors for title - adjust these based on the actual HTML structure
    let title = $("h1").first().text().trim()
    if (!title) title = $("title").text().trim()
    if (!title) title = $(".article-title").text().trim()
    if (!title) title = $(".heading").first().text().trim()
    if (!title) title = "Untitled Article"
    // Extract content - adjust selectors based on the actual HTML structure
    let content = ""

    // Try to find the main content container
    const contentSelectors = [
        "article",
        ".article-body",
        ".content",
        "main",
        "#content",
        ".article-content",
        ".post-content",
    ]

    let contentContainer
    for (const selector of contentSelectors) {
        contentContainer = $(selector)
        if (contentContainer.length > 0) break
    }

    // If we found a content container, extract text from paragraphs and headings
    if (contentContainer && contentContainer.length > 0) {
        contentContainer.find("p, h1, h2, h3, h4, h5, h6, li, blockquote").each((_, element) => {

            const text = $(element).text().trim()
            if (text) {
                // Add heading markers for better structure
                if (element.tagName.match(/^h[1-6]$/i)) {
                    content += `\n${text}\n`
                } else {
                    content += `${text}\n`
                }
            }
        })
    } else {
        // Fallback: just get all paragraphs and headings from the document
        $("p, h1, h2, h3, h4, h5, h6, li, blockquote").each((_, element) => {
            const text = $(element).text().trim()
            if (text) {
                content += `${text}\n`
            }
        })
    }

    // Clean up the content
    content = content.replace(/\n{3,}/g, "\n\n").trim()

    // Try to extract a URL if it exists in the HTML
    const url = $('link[rel="canonical"]').attr("href") || $('meta[property="og:url"]').attr("content") || sourceUrl

    // Try to extract a date if it exists
    const lastUpdated =
        $('meta[property="article:modified_time"]').attr("content") ||
        $("time").attr("datetime") ||
        new Date().toISOString()

    // Generate a unique ID
    const id = uuidv4()

    return {
        id,
        title,
        content,
        url,
        category,
        lastUpdated,
    }
}

/**
 * Processes a single HTML file and converts it to a support article
 * @param filePath Path to the HTML file
 * @param sourceUrl Optional source URL
 * @param category Optional category
 * @returns A SupportArticle object
 */
function processHtmlFile(filePath: string, sourceUrl?: string, category?: string): SupportArticle {
    console.log(`Processing file: ${filePath}`)

    try {
        const html = fs.readFileSync(filePath, "utf8")

        // If sourceUrl is not provided, try to derive it from the filename
        const derivedUrl =
            sourceUrl || `https://support.allyoucanlearn.nl/hc/en-001/articles/${path.basename(filePath, ".html")}`

        // If category is not provided, try to derive it from the directory structure
        const derivedCategory = category || path.basename(path.dirname(filePath))

        return extractArticleFromHtml(html, derivedUrl, derivedCategory)
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error)
        throw error
    }
}

/**
 * Processes a directory of HTML files
 * @param dirPath Path to the directory
 * @param sourceUrl Optional base source URL
 * @param category Optional default category
 * @returns Array of SupportArticle objects
 */
function processDirectory(dirPath: string, sourceUrl?: string, category?: string): SupportArticle[] {
    console.log(`Processing directory: ${dirPath}`)

    try {
        const articles: SupportArticle[] = []
        const files = fs.readdirSync(dirPath)

        for (const file of files) {
            const filePath = path.join(dirPath, file)
            const stats = fs.statSync(filePath)

            if (stats.isDirectory()) {
                // If it's a subdirectory, process it recursively
                // Use the directory name as the category if none is provided
                const subDirCategory = category || path.basename(filePath)
                const subDirArticles = processDirectory(filePath, sourceUrl, subDirCategory)
                articles.push(...subDirArticles)
            } else if (stats.isFile() && (file.endsWith(".html") || file.endsWith(".htm"))) {
                // If it's an HTML file, process it
                try {
                    const article = processHtmlFile(filePath, sourceUrl, category)
                    articles.push(article)
                } catch (error) {
                    console.error(`Skipping file ${filePath} due to error`)
                }
            }
        }

        return articles
    } catch (error) {
        console.error(`Error processing directory ${dirPath}:`, error)
        throw error
    }
}

/**
 * Main function to convert HTML to support articles
 * @param input Path to a file or directory
 * @param outputPath Path to save the output JSON
 * @param sourceUrl Optional base source URL
 * @param category Optional default category
 */
export function convertHtmlToArticles(
    input: string,
    outputPath = "data/support-articles.json",
    sourceUrl?: string,
    category = "For participants",
): void {
    console.log(`Starting conversion from ${input} to ${outputPath}`)

    try {
        // Check if the input path exists
        if (!fs.existsSync(input)) {
            throw new Error(`Input path does not exist: ${input}`)
        }

        let articles: SupportArticle[] = []

        // Check if the input is a file or directory
        const stats = fs.statSync(input)
        if (stats.isFile()) {
            // Process a single file
            if (input.endsWith(".html") || input.endsWith(".htm")) {
                const article = processHtmlFile(input, sourceUrl, category)
                articles.push(article)
            } else {
                throw new Error(`Input file is not an HTML file: ${input}`)
            }
        } else if (stats.isDirectory()) {
            // Process a directory
            articles = processDirectory(input, sourceUrl, category)
        } else {
            throw new Error(`Input is neither a file nor a directory: ${input}`)
        }

        // Create the output directory if it doesn't exist
        const outputDir = path.dirname(outputPath)
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }

        // Write the articles to the output file
        fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2))

        console.log(`Successfully converted ${articles.length} articles to ${outputPath}`)
    } catch (error) {
        console.error("Error during conversion:", error)
        throw error
    }
}

// Command line interface
function main() {
    const args = process.argv.slice(2)

    if (args.length < 1) {
        console.log(`
Usage: ts-node html-to-articles.ts <input> [output] [sourceUrl] [category]

Arguments:
  input       Path to an HTML file or directory of HTML files
  output      Path to save the output JSON (default: data/support-articles.json)
  sourceUrl   Base URL for the articles (default: https://support.allyoucanlearn.nl)
  category    Default category for the articles (default: For participants)

Examples:
  ts-node html-to-articles.ts support.html
  ts-node html-to-articles.ts ./html-files data/custom-articles.json
  ts-node html-to-articles.ts ./html-files data/articles.json https://docs.example.com "User Guide"
`)
        process.exit(1)
    }

    const input = args[0]
    const output = args[1] || "data/support-articles.json"
    const sourceUrl = args[2]
    const category = args[3] || "For participants"

    try {
        convertHtmlToArticles(input, output, sourceUrl, category)
    } catch (error) {
        console.error("Conversion failed:", error)
        process.exit(1)
    }
}

// Run the script if it's called directly
if (require.main === module) {
    main()
} else {
    // Export functions for use in other scripts
    module.exports = {
        convertHtmlToArticles,
        processHtmlFile,
        processDirectory,
        extractArticleFromHtml,
    }
}

