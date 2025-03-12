import { loadArticlesFromFile, type SupportArticle } from "../utils/scraper"

// Simple in-memory cache for articles
let articlesCache: SupportArticle[] | null = null

// Function to get all support articles
export async function getSupportArticles(): Promise<SupportArticle[]> {
    if (articlesCache) {
        return articlesCache
    }

    // Load articles from file
    articlesCache = loadArticlesFromFile()
    return articlesCache
}

// Function to search for relevant articles based on a query
export async function searchSupportArticles(query: string): Promise<SupportArticle[]> {
    const articles = await getSupportArticles()

    if (!query.trim()) {
        return []
    }

    // Check if query is primarily non-English
    const nonEnglishPattern = /[^\x00-\x7F]+/
    if (nonEnglishPattern.test(query)) {
        return []
    }

    // Normalize the query
    const normalizedQuery = query.toLowerCase()

    // Calculate relevance score for each article
    const scoredArticles = articles.map((article) => {
        const titleScore = calculateRelevanceScore(article.title.toLowerCase(), normalizedQuery)
        const contentScore = calculateRelevanceScore(article.content.toLowerCase(), normalizedQuery)

        // Title matches are more important than content matches
        const totalScore = titleScore * 2 + contentScore

        return {
            ...article,
            relevanceScore: totalScore,
        }
    })

    // Sort by relevance score (descending) and filter out irrelevant articles
    // Increase the minimum score threshold to reduce false positives
    return scoredArticles
        .filter((article) => article.relevanceScore > 1.5)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
}

// Helper function to calculate relevance score
function calculateRelevanceScore(text: string, query: string): number {
    // Split the query into words and filter out short words and common stop words
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'for', 'to', 'from', 'in', 'a', 'an', 'and', 'or', 'but', 'het', 'de', 'een', 'wat', 'hoe', 'waar'])
    const queryWords = query
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))

    if (queryWords.length === 0) {
        return 0
    }

    let score = 0

    // Check for exact phrase match (highest score)
    if (text.includes(query)) {
        score += 10
    }

    // Check for individual word matches
    for (const word of queryWords) {
        // Only match whole words
        const wordRegex = new RegExp(`\\b${word}\\b`, 'i')
        if (wordRegex.test(text)) {
            score += 1

            // Bonus for word at the beginning of text or after punctuation
            if (text.startsWith(word) || text.match(new RegExp(`[.!?\\-\\s]${word}\\b`))) {
                score += 0.5
            }
        }
    }

    return score
}

// Function to get a specific article by ID
export async function getArticleById(id: string): Promise<SupportArticle | null> {
    const articles = await getSupportArticles()
    return articles.find((article) => article.id === id) || null
}


// import type { ISupportArticle } from "@/modules/chat/types"

// export const fetchSupportArticles = async (): Promise<ISupportArticle[]> => {
//     /*  Idealy this should come from an api or vectordatabase
//         but for now we'll just return a static list */
//     return [
//         {
//             id: "1",
//             title: "The structure of a course",
//             content: `Each course on All You Can Learn has a similar structure. A course consists of modules, and each module consists of lessons. In this article, we'll explain how a course is structured.

// Modules
// A course consists of multiple modules. Each module covers a specific topic or theme. Modules are displayed in the left sidebar of the course.

// Lessons
// Each module contains multiple lessons. Lessons are the actual content of the course. They can be videos, text, quizzes, or assignments. Lessons are displayed in the main content area of the course.

// Progress Tracking
// Your progress is tracked automatically. When you complete a lesson, it will be marked as completed. You can see your overall progress at the top of the course.`,
//             url: "https://support.allyoucanlearn.nl/hc/en-001/articles/4929793538461-The-structure-of-a-course",
//             category: "Starting a course",
//         },
//         {
//             id: "2",
//             title: "(Un)enrolling a course (participants)",
//             content: `Enrolling in a Course
// To enroll in a course on All You Can Learn:
// 1. Log in to your account
// 2. Browse the course catalog or use the search function
// 3. Click on the course you want to take
// 4. Click the "Enroll" or "Start Course" button
// 5. Follow any additional instructions if required

// Unenrolling from a Course
// If you need to unenroll from a course:
// 1. Log in to your account
// 2. Go to "My Courses" in your dashboard
// 3. Find the course you want to unenroll from
// 4. Click the "Unenroll" or "Leave Course" option
// 5. Confirm your decision

// Note: Depending on the course and your institution's policies, there may be limitations on unenrolling from certain courses. If you're taking a course as part of a program or curriculum, please check with your institution before unenrolling.`,
//             url: "https://support.allyoucanlearn.nl/hc/en-001/articles/4929758561693--Un-enrolling-a-course-participants",
//             category: "Starting a course",
//         },
//         {
//             id: "3",
//             title: "For whom is All You Can Learn?",
//             content: `All You Can Learn is designed for various types of learners:

// Students in Educational Institutions
// - Students in MBO (vocational education)
// - Students in higher education
// - Students looking for additional learning resources

// Individual Learners
// - Professionals seeking to expand their skills
// - Anyone interested in citizenship education
// - Self-directed learners looking for structured courses

// Educational Institutions
// - Schools and colleges offering citizenship courses
// - Educational organizations looking for digital learning solutions
// - Teachers and educators seeking quality learning materials

// All You Can Learn offers over 80 courses on citizenship (Burgerschap) and career orientation (LOB), making it suitable for a wide range of educational needs.`,
//             url: "https://support.allyoucanlearn.nl/hc/en-001/articles/4929793538461-For-whom-is-All-You-Can-Learn",
//             category: "Starting a course",
//         },
//         {
//             id: "4",
//             title: "Navigation via the menu bar (participants)",
//             content: `Navigating the All You Can Learn Platform

// The main menu bar at the top of the platform provides easy access to all features:

// Home
// - Returns you to the main dashboard
// - Shows your enrolled courses and recommendations

// My Courses
// - Displays all courses you're currently enrolled in
// - Shows your progress in each course
// - Allows you to continue where you left off

// Course Catalog
// - Browse all available courses
// - Filter courses by category, level, or topic
// - See featured and new courses

// Profile
// - View and edit your personal information
// - Change your password
// - Manage notification settings

// Help & Support
// - Access the support center
// - Find answers to common questions
// - Contact support if needed

// The menu bar is always accessible from any page on the platform, making navigation simple and intuitive.`,
//             url: "https://support.allyoucanlearn.nl/hc/en-001/articles/4929758561693-Navigation-via-the-menu-bar-participants",
//             category: "During a course",
//         },
//         {
//             id: "5",
//             title: "Can I get an invoice for my purchase?",
//             content: `Getting an Invoice for Your Purchase

// Yes, you can get an invoice for any purchase made on All You Can Learn. Here's how:

// For Individual Purchases:
// 1. Log in to your account
// 2. Go to "My Account" or "Profile"
// 3. Select "Purchase History" or "Billing"
// 4. Find the purchase you need an invoice for
// 5. Click "Download Invoice" or "Request Invoice"

// For Institutional Purchases:
// If your institution made the purchase on your behalf, please contact your institution's administration or finance department.

// Invoice Requirements:
// If you need specific information on your invoice (like VAT number, specific billing address, or purchase order reference), please contact our support team before making your purchase.

// Contact for Invoice Issues:
// If you have any issues with invoices or need a special format, please contact our billing department at billing@allyoucanlearn.nl.`,
//             url: "https://support.allyoucanlearn.nl/hc/en-001/articles/4929758561693-Can-I-get-an-invoice-for-my-purchase",
//             category: "During a course",
//         },
//     ]
// }

// export const searchSupportArticles = async (query: string): Promise<ISupportArticle[]> => {
//     const articles = await fetchSupportArticles()

//     if (!query) return articles

//     const searchTerms = query.toLowerCase().split(" ")

//     return articles.filter((article) => {
//         const titleLower = article.title.toLowerCase()
//         const contentLower = article.content.toLowerCase()

//         return searchTerms.some((term) => titleLower.includes(term) || contentLower.includes(term))
//     })
// }

