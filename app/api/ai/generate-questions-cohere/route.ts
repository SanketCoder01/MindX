import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, subject, difficulty, questionCount, questionType } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting Cohere AI question generation...');
    console.log('📝 Prompt:', prompt);
    console.log('📚 Subject:', subject);
    console.log('🎯 Difficulty:', difficulty);
    console.log('🔢 Question Count:', questionCount);
    console.log('📋 Question Type:', questionType);
    console.log('🔑 API Key available:', !!process.env.COHERE_API_KEY);
    console.log('🔑 API Key length:', process.env.COHERE_API_KEY?.length || 0);

    if (!process.env.COHERE_API_KEY) {
      console.error('❌ COHERE_API_KEY is not set');
      return NextResponse.json(
        { error: 'COHERE_API_KEY is not set in environment variables' },
        { status: 500 }
      );
    }

    const timestamp = Date.now();
    const coherePrompt = `You are an expert educator. Generate a question paper for ${subject || 'General'} with ${questionCount || 5} ${difficulty || 'medium'} level questions about: ${prompt}

Format as clean text with:
RULES:
- Time limit: 3 hours
- Total marks: 100
- Answer all questions

INSTRUCTIONS:
- Read questions carefully
- Write clearly
- Manage time effectively

QUESTIONS:
[Generate ${questionCount || 5} numbered questions here]

ANSWER KEY:
[Provide answers for each question]

No asterisks or markdown formatting. Request ID: ${timestamp}`;

    console.log('📡 Making request to Cohere API...');
    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'command',
        prompt: coherePrompt,
        max_tokens: 2000,
        temperature: 0.7,
        k: 0,
        stop_sequences: [],
        return_likelihoods: 'NONE'
      })
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cohere API Error:', response.status, errorText);
      throw new Error(`Cohere API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.generations[0]?.text;
    
    console.log('✅ Raw AI Response Length:', aiResponse?.length || 0);
    console.log('📄 Response Preview:', aiResponse?.substring(0, 200) + '...');
    
    if (!aiResponse || aiResponse.length < 50) {
      console.log('⚠️ AI response too short, using fallback');
      const fallbackData = generateFallbackQuestions(prompt, subject, difficulty, questionCount, questionType);
      return NextResponse.json({
        success: true,
        data: fallbackData,
        warning: 'Used fallback due to short AI response'
      });
    }
    
    // Parse the text response into structured format
    const questionsData = {
      examTitle: `Question Paper - ${subject || 'General'}`,
      rules: [
        'Time limit: 3 hours',
        'Total marks: 100',
        'Answer all questions',
        'All questions are compulsory'
      ],
      instructions: [
        `This question paper contains ${questionCount || 5} questions`,
        'Total marks: 100 marks',
        'Time allowed: 180 minutes',
        'All questions are compulsory',
        'Read the questions carefully before answering'
      ],
      questions: aiResponse,
      answerKey: 'Detailed answers provided in the response above'
    };

    return NextResponse.json({
      success: true,
      data: {
        ...questionsData,
        metadata: {
          subject: subject || 'General',
          difficulty: difficulty || 'medium',
          questionCount: questionCount || 5,
          generatedAt: new Date().toISOString(),
          source: 'Cohere Command',
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
      'General topic',
      'General',
      'medium',
      5,
      'mixed'
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
