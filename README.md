# AI Chat Assistant

A modern, responsive AI chat assistant built with Next.js and powered by Google's Gemini API. This application provides a sleek interface for users to have text-based conversations with an AI assistant.

## Features

- 🤖 **AI-Powered Conversations**: Integrated with Google Gemini API for intelligent responses
- 💬 **Real-time Chat Interface**: Modern, responsive chat UI with message history
- ⚡ **Fast & Efficient**: Built with Next.js for optimal performance
- 🎨 **Modern Design**: Clean, intuitive interface with Tailwind CSS
- 📱 **Responsive**: Works seamlessly on desktop and mobile devices
- 🔒 **Secure**: Environment variable configuration for API keys

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Google Generative AI (Gemini API)
- **Development**: ESLint, PostCSS, Autoprefixer

## Prerequisites

Before running this application, make sure you have:

- Node.js 18+ installed
- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Installation

1. **Clone the repository** (if applicable) or ensure you're in the project directory:
   ```bash
   cd ai_assistant
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy the `.env.local` file or create it if it doesn't exist
   - Add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

## Usage

### Development Mode

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or the next available port).

### Production Build

Build the application for production:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

### Linting

Run ESLint to check code quality:
```bash
npm run lint
```

## Project Structure

```
ai_assistant/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts       # API endpoint for Gemini integration
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout component
│   │   └── page.tsx               # Main page component
│   └── components/
│       └── ChatInterface.tsx      # Main chat interface component
├── .env.local                     # Environment variables
├── .github/
│   └── copilot-instructions.md    # Project-specific instructions
├── package.json                   # Project dependencies and scripts
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## How It Works

1. **User Interface**: The chat interface is built with React components and styled with Tailwind CSS
2. **Message Handling**: User messages are sent to the `/api/chat` endpoint
3. **AI Processing**: The API route uses the Gemini API to generate responses
4. **Real-time Updates**: Messages are displayed in real-time with loading indicators

## API Endpoints

### POST `/api/chat`

Sends a message to the Gemini AI and returns a response.

**Request Body:**
```json
{
  "message": "Your question here"
}
```

**Response:**
```json
{
  "response": "AI generated response"
}
```

## Configuration

### Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key (required)

### Customization

You can customize the application by:

- Modifying the UI in `src/components/ChatInterface.tsx`
- Adjusting styles in `src/app/globals.css` or Tailwind classes
- Configuring the AI model parameters in `src/app/api/chat/route.ts`

## Troubleshooting

### Common Issues

1. **"Gemini API key not configured"**
   - Ensure your `.env.local` file contains a valid `GEMINI_API_KEY`
   - Restart the development server after adding the key

2. **Build errors related to TypeScript**
   - Run `npm run lint` to check for code issues
   - Ensure all dependencies are installed with `npm install`

3. **Port already in use**
   - The application will automatically try the next available port
   - You can manually specify a port: `npm run dev -- -p 3002`

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new components
3. Add appropriate error handling
4. Test the application before submitting changes

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the Google Gemini API documentation
3. Check Next.js documentation for framework-related issues

---

**Note**: Remember to keep your API keys secure and never commit them to version control.