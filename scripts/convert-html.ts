import { convertHtmlToArticles } from "./html-to-article"

// This script provides a simple way to run the HTML to articles converter
async function main() {
    try {
        // Get command line arguments
        const args = process.argv.slice(2)

        if (args.length < 1) {
            console.log(`
Usage: npm run convert-html -- <input> [output] [sourceUrl] [category]

Arguments:
  input       Path to an HTML file or directory of HTML files
  output      Path to save the output JSON (default: data/support-articles.json)
  sourceUrl   Base URL for the articles (default: https://support.allyoucanlearn.nl)
  category    Default category for the articles (default: For participants)

Examples:
  npm run convert-html -- support.html
  npm run convert-html -- ./html-files data/custom-articles.json
  npm run convert-html -- ./html-files data/articles.json https://docs.example.com "User Guide"
`)
            process.exit(1)
        }

        const input = args[0]
        const output = args[1] || "data/support-articles.json"
        const sourceUrl = args[2]
        const category = args[3] || "For participants"

        console.log("Starting HTML to articles conversion...")
        console.log(`Input: ${input}`)
        console.log(`Output: ${output}`)

        convertHtmlToArticles(input, output, sourceUrl, category)

        console.log("Conversion completed successfully!")
    } catch (error) {
        console.error("Error running conversion:", error)
        process.exit(1)
    }
}

main()

