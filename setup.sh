#!/bin/bash
# AI Product Delivery Copilot — Setup Script

set -e

echo "🚀 Setting up AI Product Delivery Copilot..."

# Frontend
echo "📦 Installing frontend dependencies..."
cd "$(dirname "$0")/frontend"
npm install

# Backend
echo "📦 Installing backend dependencies..."
cd "$(dirname "$0")/backend"
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "  Terminal 1 — Backend:"
echo "    cd backend && uvicorn main:app --reload --port 8000"
echo ""
echo "  Terminal 2 — Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open: http://localhost:3000"
echo ""
echo "⚠️  Don't forget to create backend/.env with your OPENAI_API_KEY"