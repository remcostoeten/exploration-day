import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { messageId, isHelpful, comment, messageContent } = await req.json();

        if (!messageId) {
            return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
        }

        const feedback = {
            id: Date.now().toString(),
            messageId,
            isHelpful,
            comment: comment || '',
            messageContent,
            timestamp: new Date().toISOString(),
        };

        // In a real implementation, this would be stored in a database
        // For exploration day, we'll log it to the console
        console.log('Feedback received:', feedback);

        // Simulate storing in a file (this won't actually work in production)
        try {
            const dataDir = path.join(process.cwd(), 'data');
            const filePath = path.join(dataDir, 'feedback.json');

            // Create the data directory if it doesn't exist
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Read existing feedback or create an empty array
            let feedbackData = [];
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                feedbackData = JSON.parse(fileContent);
            }

            // Add the new feedback
            feedbackData.push(feedback);

            // Write the updated feedback data
            fs.writeFileSync(filePath, JSON.stringify(feedbackData, null, 2));

            console.log('Feedback stored in file');
        } catch (fileError) {
            console.error('Error storing feedback in file:', fileError);
            // This is expected in production environments where file writing is restricted
            // We'll just log the error and continue
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in feedback API:', error);

        return NextResponse.json({ error: 'Failed to process feedback' }, { status: 500 });
    }
}