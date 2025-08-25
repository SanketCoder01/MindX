"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TestTube, Play, CheckCircle, AlertTriangle } from 'lucide-react';

interface TestResult {
  testNumber: number;
  timestamp: string;
  result: any;
  debug: any;
  error?: string;
}

export default function QuestionGenerationTest() {
  const [prompt, setPrompt] = useState('Explain the concept of data structures');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [testCount, setTestCount] = useState(0);

  const runTest = async () => {
    setLoading(true);
    const currentTest = testCount + 1;
    setTestCount(currentTest);

    try {
      const response = await fetch('/api/test-question-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          testNumber: currentTest
        })
      });

      const result = await response.json();
      setTestResults(prev => [result, ...prev]);
      
    } catch (error) {
      const errorResult: TestResult = {
        testNumber: currentTest,
        timestamp: new Date().toISOString(),
        result: null,
        debug: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setTestResults(prev => [errorResult, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setTestCount(0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-blue-600" />
            Question Generation Debug Test
          </CardTitle>
          <p className="text-sm text-gray-600">
            Test the question generation API to debug the second prompt issue
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Test Prompt</label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt to test"
              className="mt-1"
            />
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={runTest}
              disabled={!prompt.trim() || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Play className="h-4 w-4 mr-2 animate-spin" />
                  Running Test {testCount + 1}...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Test {testCount + 1}
                </>
              )}
            </Button>
            
            {testResults.length > 0 && (
              <Button variant="outline" onClick={clearResults}>
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <p className="text-sm text-gray-600">
              {testResults.length} test(s) completed
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {testResults.map((test, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">Test #{test.testNumber}</h4>
                    <div className="flex gap-2">
                      {test.error ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      ) : test.result?.success ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {new Date(test.timestamp).toLocaleTimeString()}
                      </Badge>
                    </div>
                  </div>
                  
                  {test.error ? (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {test.error}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Questions Generated:</span>
                          <span className="ml-2">{test.debug?.questionCount || 0}</span>
                        </div>
                        <div>
                          <span className="font-medium">Source:</span>
                          <span className="ml-2">{test.result?.data?.metadata?.source || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="font-medium">Prompt Length:</span>
                          <span className="ml-2">{test.debug?.promptLength}</span>
                        </div>
                        <div>
                          <span className="font-medium">Response OK:</span>
                          <span className="ml-2">{test.debug?.responseOk ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                      
                      {test.result?.warning && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            {test.result.warning}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {test.result?.data?.questions && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 mb-1">Generated Questions:</p>
                          <div className="text-xs text-gray-700 space-y-1">
                            {test.result.data.questions.slice(0, 2).map((q: any, qIndex: number) => (
                              <div key={qIndex} className="truncate">
                                {qIndex + 1}. {q.question}
                              </div>
                            ))}
                            {test.result.data.questions.length > 2 && (
                              <div className="text-gray-500">
                                ... and {test.result.data.questions.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
