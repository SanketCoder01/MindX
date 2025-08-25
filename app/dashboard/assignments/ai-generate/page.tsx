"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ArrowLeft, Copy, Download } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AIGenerateAssignmentPage() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Please enter a prompt", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          type: 'assignment',
          difficulty: 'medium',
          count: 5
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedContent(result.data);
        toast({ title: "Success", description: "Assignment questions generated successfully!" });
      } else {
        throw new Error(result.error || 'Failed to generate questions');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast({ 
        title: "Generation Failed", 
        description: "Failed to generate questions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Content copied to clipboard!" });
  };

  const downloadAsText = () => {
    if (!generatedContent) return;
    
    const content = `Assignment: ${generatedContent.title || 'AI Generated Assignment'}

Description: ${generatedContent.description || ''}

Questions:
${generatedContent.questions?.map((q: any, i: number) => `${i + 1}. ${q.question}${q.options ? '\nOptions:\n' + q.options.map((opt: string, j: number) => `   ${String.fromCharCode(97 + j)}) ${opt}`).join('\n') : ''}`).join('\n\n') || ''}

Instructions: ${generatedContent.instructions || ''}

Marking Scheme: ${generatedContent.markingScheme || ''}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-generated-assignment.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Link href="/dashboard/assignments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
              AI Assignment Generator
            </h1>
            <p className="text-gray-600 mt-1">Generate comprehensive assignments using AI</p>
          </div>
        </motion.div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Describe Your Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Assignment Prompt</label>
                <Textarea
                  placeholder="Example: Create a programming assignment on data structures focusing on linked lists with 3 problems of varying difficulty levels. Include theoretical questions about time complexity and practical coding challenges."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] border-purple-200 focus:border-purple-400"
                />
              </div>
              <Button 
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="bg-purple-600 hover:bg-purple-700 w-full"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating Assignment...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Assignment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Generated Content */}
        {generatedContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-green-700">Generated Assignment</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(generatedContent, null, 2))}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsText}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {generatedContent.title && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Title</h3>
                    <p className="bg-gray-50 p-3 rounded-lg">{generatedContent.title}</p>
                  </div>
                )}

                {generatedContent.description && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Description</h3>
                    <p className="bg-gray-50 p-3 rounded-lg">{generatedContent.description}</p>
                  </div>
                )}

                {generatedContent.questions && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Questions</h3>
                    <div className="space-y-4">
                      {generatedContent.questions.map((question: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <p className="font-medium mb-2">Q{index + 1}. {question.question}</p>
                          {question.options && (
                            <div className="ml-4 space-y-1">
                              {question.options.map((option: string, optIndex: number) => (
                                <p key={optIndex} className="text-sm text-gray-600">
                                  {String.fromCharCode(97 + optIndex)}) {option}
                                </p>
                              ))}
                            </div>
                          )}
                          {question.marks && (
                            <p className="text-sm text-blue-600 mt-2">Marks: {question.marks}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedContent.instructions && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Instructions</h3>
                    <p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{generatedContent.instructions}</p>
                  </div>
                )}

                {generatedContent.markingScheme && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Marking Scheme</h3>
                    <p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{generatedContent.markingScheme}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
