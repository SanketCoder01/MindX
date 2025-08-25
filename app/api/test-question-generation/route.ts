import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, testNumber } = await request.json();
    
    console.log(`🧪 Test ${testNumber}: Testing question generation`);
    console.log(`📝 Prompt: "${prompt}"`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    
    // Call the actual question generation API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/generate-questions-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        subject: 'Test Subject',
        difficulty: 'medium',
        questionCount: 3,
        questionType: 'mixed'
      })
    });
    
    const result = await response.json();
    
    console.log(`✅ Test ${testNumber} Result:`, {
      success: result.success,
      questionsCount: result.data?.questions?.length || 0,
      source: result.data?.metadata?.source,
      warning: result.warning
    });
    
    return NextResponse.json({
      testNumber,
      timestamp: new Date().toISOString(),
      result,
      debug: {
        promptLength: prompt.length,
        responseOk: response.ok,
        hasQuestions: !!result.data?.questions,
        questionCount: result.data?.questions?.length || 0
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Test failed:`, errorMessage);
    
    return NextResponse.json({
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
