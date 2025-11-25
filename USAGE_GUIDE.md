# VisionAi Usage Guide

## Overview
VisionAi is a dual-mode AI assistant that can both chat with you and generate images based on your descriptions.

## Features

### 1. Chat Mode 💬
Engage in intelligent conversations with the AI assistant powered by GPT OSS 120b model.

**How to use:**
1. Click the **💬 Chat** button in the header
2. Type your message in the input field
3. Press Enter or click the send button
4. Wait for the AI to respond

**Best practices:**
- Be clear and specific with your questions
- You can ask follow-up questions - the AI remembers the conversation
- Use shift+enter to create new lines in your message
- The AI can help with coding, explanations, brainstorming, and more

**Example prompts:**
- "Explain quantum computing in simple terms"
- "Write a Python function to calculate fibonacci numbers"
- "Give me tips for learning a new language"
- "Help me plan a weekend trip"

### 2. Image Generation Mode 🎨
Create stunning images from text descriptions using Google/NanoBanana Pro model.

**How to use:**
1. Click the **🎨 Image** button in the header
2. Describe the image you want to create
3. Press Enter or click the send button
4. Wait 15-30 seconds for the image to generate
5. View the image inline or click "Open in new tab" for full size

**Best practices:**
- Be descriptive and specific about what you want
- Include details about style, colors, mood, and composition
- Mention specific art styles if desired (e.g., "in anime style", "photorealistic")
- Use negative prompts by mentioning what you DON'T want (the API handles this automatically)

**Example prompts:**
- "A serene mountain landscape at sunset with purple and orange clouds"
- "A futuristic cyberpunk city with neon lights and flying cars"
- "A cute cartoon cat playing with a ball of yarn, watercolor style"
- "A photorealistic portrait of a wise old wizard with a long white beard"
- "Abstract geometric art with vibrant colors and sharp angles"

## Additional Features

### Chat History
- Your conversations are automatically saved locally
- Access previous chats from the sidebar
- Click on any chat to resume the conversation
- Delete unwanted chats by hovering and clicking the trash icon

### New Chat
- Click the "New chat" button in the sidebar to start fresh
- Your previous chat will be saved automatically

### Responsive Design
- Works on desktop, tablet, and mobile devices
- Sidebar auto-hides on mobile for better screen space
- Touch-friendly interface

## Tips & Tricks

1. **Switching Modes**: You can switch between Chat and Image modes at any time
2. **Better Images**: More detailed prompts generally produce better images
3. **Conversation Context**: The AI remembers your conversation in Chat mode
4. **Markdown Support**: Chat responses support markdown formatting with code blocks, lists, and more
5. **Loading States**: Watch for the animated loading indicator while waiting for responses

## Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message input

## Limitations

- Image generation takes 15-30 seconds per image
- Chat history is stored locally (cleared if browser cache is cleared)
- Maximum 20 recent chats are saved
- API rate limits apply based on your ModelsLab plan

## Troubleshooting

**Images not loading?**
- Check your internet connection
- Wait a bit longer (sometimes it takes up to 30 seconds)
- Try refreshing the page
- Check if your API key has sufficient credits

**Chat not responding?**
- Check your internet connection
- Verify the API key is configured correctly
- Look at the browser console for error messages
- Try refreshing the page

## Privacy & Security

- Your API key is stored securely in environment variables
- Chat history is stored locally in your browser only
- No data is sent to third parties except the ModelsLab API for processing
- Generated images are hosted by ModelsLab

## Getting Help

If you encounter issues:
1. Check this guide first
2. Review the README.md for technical details
3. Check the browser console for error messages
4. Verify your ModelsLab API key is valid and has credits

---

Enjoy using VisionAi! 🚀
