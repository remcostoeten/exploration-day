import { NextResponse } from "next/server"
import { searchSupportArticles } from "@/modules/support/services/SupportService"

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json()

        // Search for relevant articles based on the user's query
        const relevantArticles = await searchSupportArticles(message)

        // Create a context from the relevant articles
        let context = ""
        if (relevantArticles.length > 0) {
            context = relevantArticles
                .slice(0, 3) // Limit to top 3 most relevant articles
                .map((article) => `Article: ${article.title}\n${article.content}\n\n`)
                .join("")
        }

        // Create the system message with instructions
        const systemMessage = `You are a helpful support assistant for the Dutch e-learning platform "All You Can Learn" (allyoucanlearn.nl).
Your primary role is to help users with questions about courses, technical issues, and learning content.
You should be friendly, concise, and helpful.

Here is some relevant information from our knowledge base that might help answer the user's question:

${context}

If the information above doesn't fully answer the user's question, provide the best response you can based on general knowledge about e-learning platforms.
If you don't know the answer, it's okay to say so and suggest the user contact support directly at support@allyoucanlearn.nl.`

        // Format the conversation history for the LLM
        const formattedHistory = history.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
        }))

        try {
            const ollamaResponse = await fetch("http://localhost:11434/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemMessage },
                        ...formattedHistory,
                        { role: "user", content: message },
                    ],
                }),
            })

            if (!ollamaResponse.ok) {
                throw new Error(`Ollama API error: ${ollamaResponse.status}`)
            }

            const ollamaData = await ollamaResponse.json()

            return NextResponse.json({
                content: ollamaData.message.content,
                role: "assistant",
            })
        } catch (error) {
            console.error("Error calling Ollama:", error)

            // Fallback response if Ollama is not available
            return NextResponse.json({
                content:
                    "I'm currently running in fallback mode. It seems the local LLM (Ollama) is not available. Please make sure Ollama is installed and running with the command: 'ollama run llama3'",
                role: "assistant",
            })
        }
    } catch (error) {
        console.error("Error in chat API:", error)

        return NextResponse.json(
            {
                content: "Sorry, there was an error processing your request. Please try again later.",
                role: "assistant",
            },
            { status: 500 },
        )
    }
}

