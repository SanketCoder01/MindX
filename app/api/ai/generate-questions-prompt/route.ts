import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { prompt, subject, difficulty, questionCount, questionType } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Use Gemini for question generation
    console.log('🧠 Generating questions with Gemini AI...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('⚙️ Config:', { subject, difficulty, questionCount, questionType });
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.8, // Slightly higher for more variation
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2000,
      }
    });

    const systemPrompt = "You are an expert educational assessment creator. Generate high-quality questions that test understanding and critical thinking. IMPORTANT: Respond ONLY with valid JSON format. Do not include any markdown formatting, explanations, or text outside the JSON object.";
    
    const userPrompt = `Generate ${questionCount || 5} ${difficulty || 'medium'} level ${questionType || 'mixed'} questions for the subject "${subject || 'General'}" based on this prompt:

"${prompt}"

Create questions that are relevant to the prompt content and appropriate for the specified difficulty level.

CRITICAL: Return ONLY a valid JSON object with this exact structure (no markdown, no explanations, no extra text):
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "What is the main concept discussed in the prompt?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "marks": 5
    },
    {
      "id": 2,
      "type": "short_answer",
      "question": "Explain the key points mentioned in the prompt.",
      "expectedLength": "2-3 sentences",
      "marks": 10
    },
    {
      "id": 3,
      "type": "essay",
      "question": "Analyze and discuss the topic in detail.",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "marks": 15
    }
  ],
  "totalMarks": 30,
  "estimatedTime": "45 minutes"
}

Question types to include: ${questionType === 'mixed' ? 'multiple choice, short answer, and essay questions' : questionType}
Make sure questions test understanding of the concepts mentioned in the prompt.`;

    // Add timestamp to make each request unique
    const timestamp = Date.now();
    const uniquePrompt = `${systemPrompt}\n\n${userPrompt}\n\nRequest ID: ${timestamp}`;
    
    const result = await model.generateContent(uniquePrompt);
    const aiResponse = result.response.text();
    console.log('✅ Raw AI Response Length:', aiResponse.length);
    console.log('📄 Response Preview:', aiResponse.substring(0, 200) + '...');
    
    if (!aiResponse || aiResponse.length < 50) {
      console.log('⚠️ AI response too short, using fallback');
      const fallbackData = generateFallbackQuestions(prompt, subject, difficulty, questionCount, questionType);
      return NextResponse.json({
        success: true,
        data: fallbackData,
        warning: 'Used fallback due to short AI response'
      });
    }
    
    // Clean and parse JSON from the response
    let questionsData;
    try {
      // Clean the response by removing markdown formatting
      let cleanedResponse = aiResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim();
      
      // Find JSON object in the cleaned response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        questionsData = JSON.parse(jsonStr);
        
        // Validate the structure
        if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
          throw new Error('Invalid questions structure');
        }
        
        console.log('✅ Successfully parsed JSON with', questionsData.questions.length, 'questions');
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      console.log('❌ JSON parsing failed:', errorMessage);
      console.log('Raw response:', aiResponse.substring(0, 200) + '...');
      questionsData = generateFallbackQuestions(prompt, subject, difficulty, questionCount, questionType);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...questionsData,
        metadata: {
          subject: subject || 'General',
          difficulty: difficulty || 'medium',
          questionCount: questionCount || 5,
          generatedAt: new Date().toISOString(),
          source: 'Gemini AI',
          originalPrompt: prompt
        }
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Question generation error:', errorMessage);
    console.error('🔍 Full error:', error);
    
    // Fallback generation on any error
    const fallbackData = generateFallbackQuestions(
      prompt || 'General topic',
      subject || 'General',
      difficulty || 'medium',
      questionCount || 5,
      questionType || 'mixed'
    );
    
    return NextResponse.json({
      success: true,
      data: fallbackData,
      warning: `Used fallback due to error: ${errorMessage}`
    });
  }
}

function generateFallbackQuestions(prompt: string, subject?: string, difficulty?: string, questionCount?: number, questionType?: string) {
  const count = questionCount || 5;
  const questions = [];
  
  // Generate different types of questions based on prompt
  for (let i = 1; i <= count; i++) {
    let questionTypeToUse = questionType;
    
    if (questionType === 'mixed') {
      const types = ['multiple_choice', 'short_answer', 'essay', 'true_false'];
      questionTypeToUse = types[(i - 1) % types.length];
    }
    
    let question;
    
    switch (questionTypeToUse) {
      case 'multiple_choice':
        question = {
          id: i,
          type: 'multiple_choice',
          question: `What is the main concept related to "${prompt.substring(0, 50)}..."?`,
          options: [
            `Primary concept from the prompt`,
            `Secondary aspect mentioned`,
            `Related but incorrect option`,
            `Unrelated option`
          ],
          correctAnswer: 'A',
          marks: 5
        };
        break;
        
      case 'short_answer':
        question = {
          id: i,
          type: 'short_answer',
          question: `Briefly explain the key points mentioned in: "${prompt.substring(0, 50)}..."`,
          expectedLength: '2-3 sentences',
          marks: 8
        };
        break;
        
      case 'essay':
        question = {
          id: i,
          type: 'essay',
          question: `Analyze and discuss in detail the topic: "${prompt.substring(0, 50)}..."`,
          keyPoints: [
            'Main concept analysis',
            'Supporting arguments',
            'Practical applications',
            'Conclusion and implications'
          ],
          marks: 15
        };
        break;
        
      case 'true_false':
        question = {
          id: i,
          type: 'true_false',
          question: `The prompt discusses concepts related to ${subject || 'the given topic'}.`,
          correctAnswer: 'True',
          marks: 3
        };
        break;
        
      default:
        question = {
          id: i,
          type: 'short_answer',
          question: `Explain your understanding of: "${prompt.substring(0, 50)}..."`,
          expectedLength: '3-4 sentences',
          marks: 10
        };
    }
    
    questions.push(question);
  }
  
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const estimatedTime = Math.ceil(totalMarks * 1.5) + ' minutes';
  
  return {
    questions,
    totalMarks,
    estimatedTime,
    metadata: {
      subject: subject || 'General',
      difficulty: difficulty || 'medium',
      questionCount: count,
      generatedAt: new Date().toISOString(),
      source: 'Fallback Generator',
      originalPrompt: prompt
    }
  };
}
