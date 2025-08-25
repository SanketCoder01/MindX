import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const subject = formData.get('subject') as string;
    const difficulty = formData.get('difficulty') as string || 'medium';
    const questionCount = parseInt(formData.get('questionCount') as string) || 5;
    const questionType = formData.get('questionType') as string || 'mixed';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Initialize Gemini AI
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });

    let extractedContent = '';

    // Handle different file types
    if (file.type.startsWith('image/')) {
      // For images, convert to base64 and use Gemini's vision capabilities
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      
      const imagePart = {
        inlineData: {
          data: base64,
          mimeType: file.type,
        },
      };

      const prompt = `Extract all text content from this image. Include any headings, paragraphs, bullet points, tables, or other textual information you can see.`;
      
      const result = await model.generateContent([prompt, imagePart]);
      extractedContent = result.response.text();
    } else if (file.type.includes('text') || file.name.endsWith('.txt')) {
      // For text files
      extractedContent = await file.text();
    } else {
      // For other file types (xlsx, ppt, csv), we'll extract what we can
      const bytes = await file.arrayBuffer();
      const text = new TextDecoder().decode(bytes);
      extractedContent = text.substring(0, 10000); // Limit to first 10k characters
    }

    if (!extractedContent || extractedContent.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract sufficient content from the file' },
        { status: 400 }
      );
    }

    // Use Gemini AI for question generation
    console.log('🤖 Generating questions with Gemini...');
    
    let generatedText = '';
    try {
      const questionPrompt = `
Based on the following study material content, generate ${questionCount} ${difficulty} level ${questionType} questions for the subject "${subject}".

Study Material Content:
${extractedContent}

Please generate questions in the following format:
1. For multiple choice questions: Include 4 options (A, B, C, D) with the correct answer marked
2. For short answer questions: Provide the question and expected answer length
3. For essay questions: Provide the question and key points to cover
4. For true/false questions: Include the statement and correct answer

Make sure the questions are:
- Relevant to the content provided
- Appropriate for ${difficulty} difficulty level
- Educational and test understanding of key concepts
- Well-formatted and clear

Question Types to include: ${questionType === 'mixed' ? 'multiple choice, short answer, and essay questions' : questionType}

Format the response as a JSON object with the following structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice|short_answer|essay|true_false",
      "question": "Question text here",
      "options": ["A", "B", "C", "D"], // only for multiple choice
      "correctAnswer": "A", // for multiple choice and true/false
      "expectedLength": "2-3 sentences", // for short answer
      "keyPoints": ["point1", "point2"], // for essay questions
      "marks": 5
    }
  ],
  "totalMarks": 25,
  "estimatedTime": "30 minutes"
}
`;

      const result = await model.generateContent(questionPrompt);
      generatedText = result.response.text();
      console.log('✅ Questions generated successfully with Gemini');
    } catch (geminiError) {
      console.error('❌ Gemini generation failed:', geminiError);
      throw geminiError;
    }
    
    // Try to parse JSON from the response
    let questionsData;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        questionsData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      questionsData = {
        questions: [
          {
            id: 1,
            type: "short_answer",
            question: "Based on the study material, explain the main concepts covered.",
            expectedLength: "3-4 sentences",
            marks: 10
          }
        ],
        totalMarks: 10,
        estimatedTime: "15 minutes",
        rawResponse: generatedText
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...questionsData,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          subject: subject,
          difficulty: difficulty,
          questionCount: questionCount,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Question generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
