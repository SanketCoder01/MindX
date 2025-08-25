import { NextRequest, NextResponse } from 'next/server';

// Multi-provider question generation with fallback support
export async function POST(request: NextRequest) {
  try {
    const { prompt, subject, difficulty, questionCount, questionType } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Try providers in order: Cohere -> Gemini -> OpenAI -> Groq -> Hugging Face -> Ollama -> Fallback
    const providers = [
      { name: 'Cohere', func: generateWithCohere },
      { name: 'Gemini', func: generateWithGemini },
      { name: 'OpenAI', func: generateWithOpenAI },
      { name: 'Groq', func: generateWithGroq },
      { name: 'Hugging Face', func: generateWithHuggingFace },
      { name: 'Ollama', func: generateWithOllama }
    ];

    let lastError = null;
    
    for (const provider of providers) {
      try {
        console.log(`🔄 Trying ${provider.name}...`);
        const result = await provider.func(prompt, subject, difficulty, questionCount, questionType);
        
        if (result) {
          console.log(`✅ Success with ${provider.name}`);
          return NextResponse.json({
            success: true,
            data: {
              ...result,
              metadata: {
                ...result.metadata,
                source: provider.name,
                generatedAt: new Date().toISOString(),
                originalPrompt: prompt
              }
            }
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ ${provider.name} failed:`, errorMessage);
        lastError = error;
        continue;
      }
    }

    // If all providers fail, use local fallback
    console.log('🔄 All providers failed, using local fallback...');
    const fallbackData = generateLocalFallback(prompt, subject, difficulty, questionCount, questionType);
    
    return NextResponse.json({
      success: true,
      data: fallbackData,
      warning: 'Generated using local fallback due to API unavailability'
    });

  } catch (error) {
    console.error('Question generation error:', error);
    
    const fallbackData = generateLocalFallback('General topic', 'General', 'medium', 5, 'mixed');
    
    return NextResponse.json({
      success: true,
      data: fallbackData,
      warning: 'Generated using local fallback due to system error'
    });
  }
}

// 1. Cohere Provider
async function generateWithCohere(prompt: string, subject?: string, difficulty?: string, questionCount?: number, questionType?: string) {
  if (!process.env.COHERE_API_KEY) throw new Error('Cohere API key not configured');
  
  const response = await fetch('https://api.cohere.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'command-xlarge-nightly',
      prompt: buildPrompt(prompt, subject, difficulty, questionCount, questionType),
      max_tokens: 2000,
      temperature: 0.7,
      k: 0,
      stop_sequences: [],
      return_likelihoods: 'NONE'
    })
  });

  if (!response.ok) throw new Error(`Cohere API error: ${response.status}`);
  
  const data = await response.json();
  const aiResponse = data.generations[0]?.text;
  
  return parseAIResponse(aiResponse, 'Cohere Command');
}

// 2. Gemini Provider
async function generateWithGemini(prompt: string, subject?: string, difficulty?: string, questionCount?: number, questionType?: string) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');
  
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2000,
    }
  });

  const userPrompt = buildPrompt(prompt, subject, difficulty, questionCount, questionType);
  const result = await model.generateContent(userPrompt);
  const aiResponse = result.response.text();
  
  return parseAIResponse(aiResponse, 'Gemini AI');
}

// 3. OpenAI Provider
async function generateWithOpenAI(prompt: string, subject?: string, difficulty?: string, questionCount?: number, questionType?: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key not configured');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational assessment creator. Generate high-quality questions that test understanding and critical thinking. Always respond with valid JSON format.'
        },
        {
          role: 'user',
          content: buildPrompt(prompt, subject, difficulty, questionCount, questionType)
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  
  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;
  
  return parseAIResponse(aiResponse, 'OpenAI GPT-3.5');
}

// 3. Hugging Face Provider
async function generateWithHuggingFace(prompt: string, subject?: string, difficulty?: string, questionCount?: number, questionType?: string) {
  if (!process.env.HUGGINGFACE_API_KEY) throw new Error('Hugging Face API key not configured');
  
  const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-large', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: buildPrompt(prompt, subject, difficulty, questionCount, questionType),
      parameters: {
        max_new_tokens: 1500,
        temperature: 0.7,
        return_full_text: false
      }
    })
  });

  if (!response.ok) throw new Error(`Hugging Face API error: ${response.status}`);
  
  const data = await response.json();
  const aiResponse = data[0]?.generated_text || data.generated_text;
  
  return parseAIResponse(aiResponse, 'Hugging Face');
}

// 4. Groq Provider
async function generateWithGroq(prompt: string, subject?: string, difficulty?: string, questionCount?: number, questionType?: string) {
  if (!process.env.GROQ_API_KEY) throw new Error('Groq API key not configured');
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational assessment creator. Generate high-quality questions that test understanding and critical thinking. Always respond with valid JSON format.'
        },
        {
          role: 'user',
          content: buildPrompt(prompt, subject, difficulty, questionCount, questionType)
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
  
  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;
  
  return parseAIResponse(aiResponse, 'Groq Llama3');
}

// 5. Ollama Provider (Local)
async function generateWithOllama(prompt: string, subject?: string, difficulty?: string, questionCount?: number, questionType?: string) {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  
  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3.1',
      prompt: buildPrompt(prompt, subject, difficulty, questionCount, questionType),
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.8,
        top_k: 40
      }
    })
  });

  if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
  
  const data = await response.json();
  const aiResponse = data.response;
  
  return parseAIResponse(aiResponse, 'Ollama Llama3.1');
}

// Helper function to build consistent prompts
function buildPrompt(prompt: string, subject?: string, difficulty?: string, questionCount?: number, questionType?: string) {
  return `Generate ${questionCount || 5} ${difficulty || 'medium'} level ${questionType || 'mixed'} questions for the subject "${subject || 'General'}" based on this prompt:

"${prompt}"

Create questions that are relevant to the prompt content and appropriate for the specified difficulty level.

Format the response as a JSON object with this exact structure:
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
}

// Helper function to parse AI responses
function parseAIResponse(aiResponse: string, source: string) {
  if (!aiResponse || aiResponse.length < 50) {
    throw new Error('Response too short or empty');
  }
  
  try {
    // Clean the response by removing markdown formatting and extra text
    let cleanedResponse = aiResponse
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/Here's the JSON:/gi, '')
      .replace(/Here is the JSON:/gi, '')
      .trim();
    
    // Find JSON object in the cleaned response
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const questionsData = JSON.parse(jsonStr);
      
      // Validate the structure
      if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
        throw new Error('Invalid questions structure');
      }
      
      return {
        ...questionsData,
        metadata: {
          source,
          generatedAt: new Date().toISOString()
        }
      };
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
    throw new Error(`Failed to parse JSON: ${errorMessage}`);
  }
}

// Local fallback generator
function generateLocalFallback(prompt: string, subject?: string, difficulty?: string, questionCount?: number, questionType?: string) {
  const count = questionCount || 5;
  const questions = [];
  
  for (let i = 1; i <= count; i++) {
    let questionTypeToUse = questionType;
    
    if (questionType === 'mixed') {
      const types = ['multiple_choice', 'short_answer', 'essay', 'true_false'];
      questionTypeToUse = types[(i - 1) % types.length];
    }
    
    let question;
    const promptPreview = prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '');
    
    switch (questionTypeToUse) {
      case 'multiple_choice':
        question = {
          id: i,
          type: 'multiple_choice',
          question: `What is the main concept related to "${promptPreview}"?`,
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
          question: `Briefly explain the key points mentioned in: "${promptPreview}"`,
          expectedLength: '2-3 sentences',
          marks: 8
        };
        break;
        
      case 'essay':
        question = {
          id: i,
          type: 'essay',
          question: `Analyze and discuss in detail the topic: "${promptPreview}"`,
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
          question: `Explain your understanding of: "${promptPreview}"`,
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
      source: 'Local Fallback Generator',
      originalPrompt: prompt
    }
  };
}
