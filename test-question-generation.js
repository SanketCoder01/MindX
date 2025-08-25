// Test script for question generation API
const testQuestionGeneration = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/ai/generate-questions-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "Data structures and algorithms focusing on **linked lists** and *binary trees*",
        subject: "Computer Science",
        difficulty: "medium",
        questionCount: 3,
        questionType: "mixed"
      })
    });

    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Question generation successful!');
      console.log(`Generated ${result.data.questions.length} questions`);
      console.log(`Total marks: ${result.data.totalMarks}`);
      console.log(`Source: ${result.data.metadata?.source}`);
    } else {
      console.log('\n❌ Question generation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testQuestionGeneration();
