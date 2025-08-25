import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

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
    } else if (file.type.includes('pdf')) {
      // For PDF files, we'll try to extract text (basic approach)
      const bytes = await file.arrayBuffer();
      const text = new TextDecoder().decode(bytes);
      extractedContent = text.substring(0, 10000); // Limit to first 10k characters
    } else {
      // For other file types (doc, docx), we'll extract what we can
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

    // Use Gemini AI for assignment generation
    console.log('🤖 Generating assignment from uploaded content with Gemini...');
    
    let generatedText = '';
    try {
      const assignmentPrompt = `
Based on the following study material content, create a comprehensive assignment with questions.

Study Material Content:
${extractedContent}

Please create an assignment with the following structure:
1. Generate 5-7 questions of mixed types (multiple choice, short answer, essay)
2. Make questions relevant to the content provided
3. Include proper instructions and marking scheme
4. Ensure questions test understanding of key concepts

Format the response as a JSON object with the following structure:
{
  "title": "Assignment Title based on content",
  "description": "Brief description of what this assignment covers",
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
  "instructions": "General instructions for students on how to complete this assignment",
  "markingScheme": "How the assignment will be marked and evaluated",
  "totalMarks": 35,
  "estimatedTime": "45 minutes"
}
`;

      const result = await model.generateContent(assignmentPrompt);
      generatedText = result.response.text();
      console.log('✅ Assignment generated successfully with Gemini');
    } catch (geminiError) {
      console.error('❌ Gemini generation failed:', geminiError);
      throw geminiError;
    }
    
    // Try to parse JSON from the response
    let assignmentData;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        assignmentData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      assignmentData = {
        title: "Assignment from Uploaded Material",
        description: "This assignment is based on the uploaded study material.",
        questions: [
          {
            id: 1,
            type: "short_answer",
            question: "Based on the uploaded material, explain the main concepts covered.",
            expectedLength: "3-4 sentences",
            marks: 10
          },
          {
            id: 2,
            type: "essay",
            question: "Discuss the key topics from the study material in detail.",
            keyPoints: ["Main concepts", "Supporting details", "Examples"],
            marks: 15
          }
        ],
        instructions: "Read the questions carefully and provide comprehensive answers based on the study material.",
        markingScheme: "Marks will be awarded for accuracy, completeness, and understanding of concepts.",
        totalMarks: 25,
        estimatedTime: "30 minutes",
        rawResponse: generatedText
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...assignmentData,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Assignment generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate assignment from uploaded file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
