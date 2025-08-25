"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, ArrowLeft, FileText, Download, Copy } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function UploadGenerateAssignmentPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Error", description: "Please upload PDF, TXT, DOC, or DOCX files only", variant: "destructive" });
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 10MB", variant: "destructive" });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUploadAndGenerate = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file first", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/ai/upload-generate-assignment', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedContent(result.data);
        toast({ title: "Success", description: "Assignment generated from uploaded file!" });
      } else {
        throw new Error(result.error || 'Failed to generate assignment');
      }
    } catch (error) {
      console.error('Upload and generation failed:', error);
      toast({ 
        title: "Generation Failed", 
        description: "Failed to process file and generate assignment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Content copied to clipboard!" });
  };

  const downloadAsText = () => {
    if (!generatedContent) return;
    
    const content = `Assignment: ${generatedContent.title || 'Generated from Upload'}

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
    a.download = 'generated-assignment-from-upload.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
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
              <Upload className="w-8 h-8 text-green-600" />
              Upload & Generate Assignment
            </h1>
            <p className="text-gray-600 mt-1">Upload study materials and auto-generate questions</p>
          </div>
        </motion.div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-600" />
                Upload Study Material
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-green-200 rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileSelect}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        {selectedFile ? selectedFile.name : "Click to upload file"}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Supports PDF, TXT, DOC, DOCX (max 10MB)
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">{selectedFile.name}</p>
                      <p className="text-sm text-green-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleUploadAndGenerate}
                disabled={uploading || !selectedFile}
                className="bg-green-600 hover:bg-green-700 w-full"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing File...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Generate Assignment
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
