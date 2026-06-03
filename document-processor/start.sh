#!/bin/bash

# Document Processor Startup Script

echo "🚀 Starting Document Processor API..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Start the API server
echo "🌐 Starting API server on port 5000..."
python app.py
