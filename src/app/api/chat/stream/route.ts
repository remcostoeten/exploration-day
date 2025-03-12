import { searchSupportArticles } from "@/modules/support/services/SupportService"

function getRandomDelay(min: number, max: number, speedMultiplier: number = 1) {
    // Ensure speedMultiplier is at least 0.1 to prevent extremely long delays
    const safeSpeedMultiplier = Math.max(0.1, speedMultiplier);
    // The higher the multiplier, the shorter the delay
    return Math.floor((Math.random() * (max - min + 1) + min) / safeSpeedMultiplier);
}

function* chunkText(text: string): Generator<string> {
    const sentences = text.split(/([.!?]+\s+)/);
    for (let i = 0; i < sentences.length; i++) {
        const words = sentences[i].split(/\s+/);
        for (const word of words) {
            if (word.trim()) {
                yield word + ' ';
            }
        }
    }
}

async function* simulateTyping(text: string, speedMultiplier: number = 1): AsyncGenerator<string> {
    let currentText = '';

    // Start with thinking time (reduced by speed multiplier)
    await new Promise(resolve => setTimeout(resolve, getRandomDelay(500, 1500, speedMultiplier)));

    for (const chunk of chunkText(text)) {
        // Add random delay between words (30-100ms, affected by speed multiplier)
        await new Promise(resolve => setTimeout(resolve, getRandomDelay(30, 100, speedMultiplier)));

        currentText += chunk;
        yield currentText;

        // Add longer pauses after punctuation (also affected by speed multiplier)
        if (/[.!?]/.test(chunk)) {
            await new Promise(resolve => setTimeout(resolve, getRandomDelay(300, 800, speedMultiplier)));
        }
    }
}

export async function POST(req: Request) {
    try {
        const { message, speedMultiplier = 1 } = await req.json()
        console.log("Received message:", message, "Speed multiplier:", speedMultiplier)

        // Search for relevant articles based on the user's query
        const relevantArticles = await searchSupportArticles(message)
        console.log("Found articles:", relevantArticles.length)

        // Create a response from the relevant articles
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let content: string;

                    if (relevantArticles.length > 0) {
                        const article = relevantArticles[0]
                        content = `Based on our support documentation:\n\n${article.content}`
                    } else {
                        content = "I am a support chatbot specifically trained to help with All You Can Learn platform questions. I cannot assist with questions outside of our support documentation, such as personal opinions or unrelated topics. Please ask me about:\n\n1. Course enrollment and structure\n2. Platform navigation\n3. Account management\n4. Billing and invoices\n5. Technical support\n\nOr check the suggested questions below for common topics."
                    }

                    // Use the speedMultiplier when simulating typing
                    for await (const partialContent of simulateTyping(content, speedMultiplier)) {
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify({ content: partialContent })}\n\n`
                            )
                        )
                    }

                    // Send DONE signal
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                    controller.close()
                } catch (error) {
                    console.error("Error in stream:", error)
                    controller.error(error)
                }
            },
        })

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        })
    } catch (error) {
        console.error("Error in chat stream API:", error)
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                // Even for errors, simulate some thinking time
                await new Promise(resolve => setTimeout(resolve, getRandomDelay(500, 1000)));

                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({
                            content: "Sorry, there was an error processing your request. Please try again later.",
                        })}\n\n`
                    )
                )
                controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                controller.close()
            },
        })

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        })
    }
}

