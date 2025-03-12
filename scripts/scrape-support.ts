import { scrapeSupportSite } from "@/modules/support/utils/scraper"

async function main() {
    console.log("Starting support site scraper...")

    try {
        const articles = await scrapeSupportSite()
        console.log(`Successfully scraped ${articles.length} articles`)
    } catch (error) {
        console.error("Error running scraper:", error)
    }
}

main()

