# AI Providers Setup for Question Generation

## Free API Alternatives When Gemini Fails

### 1. **Cohere API (FREE tier available)**
```bash
# Add to your .env.local file:
COHERE_API_KEY=coMFJxjNs8ZvL5FJD8mNrLKIX2nQEeL5jNbGVtLG
```
- Sign up at: https://cohere.ai/
- Generous free tier with high-quality responses
- Command model optimized for text generation

### 2. **OpenAI API (FREE $5 credit)**
```bash
# Add to your .env.local file:
OPENAI_API_KEY=your_openai_api_key_here
```
- Sign up at: https://platform.openai.com/
- Get $5 free credit for new accounts
- Best quality results

### 2. **Groq API (FREE - Very generous limits)**
```bash
# Add to your .env.local file:
GROQ_API_KEY=your_groq_api_key_here
```
- Sign up at: https://console.groq.com/
- Extremely fast inference
- Uses Llama 3.1 model

### 3. **Hugging Face API (FREE 30k chars/month)**
```bash
# Add to your .env.local file:
HUGGINGFACE_API_KEY=your_hf_api_key_here
```
- Sign up at: https://huggingface.co/
- 30,000 characters per month free
- Many open-source models

### 4. **Ollama (Completely FREE - Local)**
```bash
# Install Ollama locally:
# 1. Download from: https://ollama.ai/
# 2. Install and run: ollama pull llama3.1
# 3. Start server: ollama serve

# Add to your .env.local file:
OLLAMA_URL=http://localhost:11434
```
- Runs completely offline
- No API limits
- Requires local installation

## Usage

The system now supports multiple AI providers with automatic fallback:

**Single Provider Options:**
- `/api/ai/generate-questions-cohere` - Cohere API (Recommended)
- `/api/ai/generate-questions-prompt` - Gemini API

**Multi-Provider Fallback:** `/api/ai/generate-questions-fallback` tries providers in this order:
1. **Cohere** (if API key available)
2. **Gemini** (your current provider)
3. **OpenAI** (if API key available)
4. **Groq** (if API key available)
5. **Hugging Face** (if API key available) 
6. **Ollama** (if running locally)
7. **Local Fallback** (always works)

## Quick Setup Steps

1. **Choose a provider** from the list above
2. **Sign up** and get your API key
3. **Add the key** to your `.env.local` file
4. **Update your component** to use the new endpoint

## Recommended Setup

For best results, set up **OpenAI** and **Groq** as they provide the highest quality:

```bash
# .env.local
GEMINI_API_KEY=your_existing_gemini_key
OPENAI_API_KEY=your_openai_key  
GROQ_API_KEY=your_groq_key
```

This gives you 3 high-quality providers with automatic fallback!
