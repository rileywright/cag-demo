# Document Processor API

A Python microservice for processing PDF and Word documents to extract clean text and calculate compression metrics.

## Features

- **PDF Processing** - Uses `pdfplumber` for accurate text extraction
- **Word Processing** - Uses `python-docx` for DOCX file handling
- **Text Cleaning** - Removes artifacts, normalizes whitespace
- **Token Estimation** - Uses `tiktoken` for accurate token counting
- **Compression Metrics** - Calculates file size, token, and cost savings
- **ROI Analysis** - Provides cost savings and payback calculations

## Installation

```bash
# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Start the Server

```bash
python app.py
# or use the startup script
./start.sh
```

The API will be available at `http://localhost:5000`

### Endpoints

#### Health Check
```http
GET /health
```

#### Process Document
```http
POST /process
Content-Type: multipart/form-data

file: [PDF or DOCX file]
```

#### Analyze Text Only
```http
POST /analyze
Content-Type: application/json

{
  "text": "Your document text here..."
}
```

## Response Format

```json
{
  "success": true,
  "filename": "document.pdf",
  "file_type": ".pdf",
  "processed_text": "Cleaned document text...",
  "metrics": {
    "original": {
      "size_bytes": 50000,
      "size_mb": 0.0477,
      "character_count": 48000,
      "token_count": 12000
    },
    "processed": {
      "size_bytes": 45000,
      "size_mb": 0.0429,
      "character_count": 43200,
      "token_count": 10800
    },
    "compression": {
      "size_savings_bytes": 5000,
      "size_compression_percent": 10.0,
      "token_savings": 1200,
      "token_compression_percent": 10.0,
      "cost_savings_usd": 0.0036,
      "processing_time_ms": 250
    },
    "roi": {
      "cost_per_1000_tokens": 0.003,
      "estimated_monthly_savings": 0.11,
      "payback_documents": 1
    }
  }
}
```

## Integration with Node.js Backend

Add this to your Node.js backend service:

```javascript
class DocumentProcessor {
  constructor() {
    this.baseUrl = process.env.DOCUMENT_PROCESSOR_URL || 'http://localhost:5000';
  }

  async processDocument(buffer, filename, mimetype) {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', buffer, { filename, contentType: mimetype });

    const response = await fetch(`${this.baseUrl}/process`, {
      method: 'POST',
      body: form
    });

    return await response.json();
  }
}
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `DEBUG` - Enable debug mode (default: false)

## Dependencies

- `flask` - Web framework
- `pdfplumber` - PDF text extraction
- `python-docx` - Word document processing
- `tiktoken` - Token counting
- `python-multipart` - File upload support
