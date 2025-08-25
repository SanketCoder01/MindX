"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Brain, RefreshCw, CheckCircle, AlertTriangle, Download, Settings } from 'lucide-react';

interface Question {
  id: number;
  type: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false';
  question: string;
  options?: string[];
  correctAnswer?: string;
  expectedLength?: string;
  keyPoints?: string[];
  marks: number;
  section?: string;
}

interface GeneratedQuestions {
  examTitle?: string;
  rules?: string[];
  instructions?: string[];
  questions: Question[];
  totalMarks: number;
  estimatedTime: string;
  answerKey?: Array<{
    questionId: number;
    answer: string;
    explanation?: string;
  }>;
  metadata?: {
    subject: string;
    difficulty: string;
    questionCount: number;
    generatedAt: string;
    source: string;
    originalPrompt: string;
  };
}

interface PromptQuestionGeneratorProps {
  onQuestionsGenerated?: (questions: GeneratedQuestions) => void;
}

export default function PromptQuestionGenerator({ onQuestionsGenerated }: PromptQuestionGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('mixed');
  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useMultiProvider, setUseMultiProvider] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('cohere');

  const generateQuestions = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate questions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let endpoint;
      if (useMultiProvider) {
        endpoint = '/api/ai/generate-questions-fallback';
      } else if (selectedProvider === 'cohere') {
        endpoint = '/api/ai/generate-questions-cohere';
      } else {
        endpoint = '/api/ai/generate-questions-prompt';
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          subject,
          difficulty,
          questionCount,
          questionType
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedQuestions(result.data);
        onQuestionsGenerated?.(result.data);
      } else {
        setError(result.error || 'Failed to generate questions');
      }
    } catch (err) {
      setError('Network error occurred while generating questions');
    } finally {
      setLoading(false);
    }
  };

  const downloadQuestions = () => {
    if (!generatedQuestions) return;

    const dataStr = JSON.stringify(generatedQuestions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated-questions-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setPrompt('');
    setSubject('');
    setDifficulty('medium');
    setQuestionCount(5);
    setQuestionType('mixed');
    setGeneratedQuestions(null);
    setError(null);
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'bg-blue-100 text-blue-800';
      case 'short_answer': return 'bg-green-100 text-green-800';
      case 'essay': return 'bg-purple-100 text-purple-800';
      case 'true_false': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Generate Questions from Prompt
          </CardTitle>
          <p className="text-sm text-gray-600">
            Enter a topic or prompt and automatically generate relevant questions using AI
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prompt Input */}
          <div>
            <Label className="text-sm font-medium">Topic/Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the topic or prompt for question generation (e.g., 'Data structures and algorithms focusing on linked lists and trees')"
              className="mt-2 min-h-[100px]"
            />
          </div>

          {/* AI Provider Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">AI Provider</span>
                <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                  {useMultiProvider ? 'Multi-Provider' : selectedProvider === 'cohere' ? 'Cohere' : 'Gemini'}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="provider">Primary Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider} disabled={useMultiProvider}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cohere">🚀 Cohere (Recommended)</SelectItem>
                    <SelectItem value="gemini">🧠 Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseMultiProvider(!useMultiProvider)}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100 w-full"
                >
                  {useMultiProvider ? 'Use Single Provider' : 'Enable Multi-Provider'}
                </Button>
              </div>
            </div>
          </div>
          
          {useMultiProvider && (
            <Alert className="border-blue-200 bg-blue-50">
              <Settings className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Multi-Provider Mode:</strong> Will try Cohere → Gemini → OpenAI → Groq → Hugging Face → Ollama → Local Fallback
                <br />
                <span className="text-xs">See AI_PROVIDERS_SETUP.md for API key configuration</span>
              </AlertDescription>
            </Alert>
          )}

          {!useMultiProvider && selectedProvider === 'cohere' && (
            <Alert className="border-green-200 bg-green-50">
              <Settings className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Using Cohere API:</strong> Make sure COHERE_API_KEY is set in your .env.local file
                <br />
                <span className="text-xs">API Key: coMFJxjNs8ZvL5FJD8mNrLKIX2nQEeL5jNbGVtLG</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Computer Science, Mathematics"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Select value={questionCount.toString()} onValueChange={(value) => setQuestionCount(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Questions</SelectItem>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="questionType">Question Type</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed Types</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                  <SelectItem value="essay">Essay Questions</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-3">
            <Button
              onClick={generateQuestions}
              disabled={!prompt.trim() || loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>
            
            {generatedQuestions && (
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Generated Questions Display */}
      {generatedQuestions && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  {generatedQuestions.examTitle || 'Generated Questions'}
                </CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">
                    {generatedQuestions.questions.length} Questions
                  </Badge>
                  <Badge variant="outline">
                    {generatedQuestions.totalMarks} Total Marks
                  </Badge>
                  <Badge variant="outline">
                    {generatedQuestions.estimatedTime}
                  </Badge>
                  {generatedQuestions.metadata?.source && (
                    <Badge variant="outline" className="bg-purple-50">
                      {generatedQuestions.metadata.source}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadQuestions}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Rules Section */}
            {generatedQuestions.rules && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">📋 Rules</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                  {generatedQuestions.rules.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions Section */}
            {generatedQuestions.instructions && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">📝 Instructions</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                  {generatedQuestions.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Answer Key Section */}
            {generatedQuestions.answerKey && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">🔑 Answer Key (Faculty Reference)</h3>
                <div className="space-y-2 text-sm text-yellow-700">
                  {generatedQuestions.answerKey.map((answer, index) => (
                    <div key={index} className="border-l-2 border-yellow-400 pl-3">
                      <p><strong>Q{answer.questionId}:</strong> {answer.answer}</p>
                      {answer.explanation && (
                        <p className="text-xs mt-1 text-yellow-600">{answer.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedQuestions.questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">Question {index + 1}</h4>
                      {question.section && (
                        <p className="text-xs text-gray-600 mt-1">{question.section}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getQuestionTypeColor(question.type)}>
                        {question.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">{question.marks} marks</Badge>
                    </div>
                  </div>
                  
                  <div className="text-gray-800 mb-3">
                    {question.question}
                  </div>
                  
                  {question.options && (
                    <div className="space-y-1 mb-2">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded text-sm ${
                            question.correctAnswer === String.fromCharCode(65 + optIndex)
                              ? 'bg-green-100 border border-green-300'
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          <span>
                            {String.fromCharCode(65 + optIndex)}. {option}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.expectedLength && (
                    <p className="text-xs text-gray-600">
                      Expected length: {question.expectedLength}
                    </p>
                  )}
                  
                  {question.keyPoints && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">Key points to cover:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {question.keyPoints.map((point, pointIndex) => (
                          <li key={pointIndex}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
