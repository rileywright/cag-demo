"""
Document Processing API
Processes PDF and Word documents to extract clean text and calculate compression metrics
"""

from flask import Flask, request, jsonify
import pdfplumber
import docx
import re
import os
import time
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class DocumentProcessor:
    def __init__(self):
        # Use simple token estimation (4 chars per token for English text)
        self.chars_per_token = 4
    
    def clean_text(self, text):
        """Clean extracted text by normalizing whitespace and removing artifacts"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common document artifacts
        text = re.sub(r'Page \d+ of \d+', '', text)
        text = re.sub(r'\f', '', text)  # Form feeds
        
        # Clean up bullet points and numbering
        text = re.sub(r'^\s*[\•\-\*\d]+\.\s*', '', text, flags=re.MULTILINE)
        
        # Remove multiple consecutive newlines
        text = re.sub(r'\n\s*\n', '\n', text)
        
        return text.strip()
    
    def extract_text_from_pdf(self, pdf_content):
        """Extract text from PDF using pdfplumber"""
        try:
            import io
            pdf_file = io.BytesIO(pdf_content)
            
            text_parts = []
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            
            return '\n'.join(text_parts)
        except Exception as e:
            logger.error(f"Error extracting PDF text: {str(e)}")
            raise ValueError(f"PDF processing failed: {str(e)}")
    
    def extract_text_from_docx(self, docx_content):
        """Extract text from DOCX using python-docx"""
        try:
            import io
            docx_file = io.BytesIO(docx_content)
            doc = docx.Document(docx_file)
            
            text_parts = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)
            
            return '\n'.join(text_parts)
        except Exception as e:
            logger.error(f"Error extracting DOCX text: {str(e)}")
            raise ValueError(f"DOCX processing failed: {str(e)}")
    
    def estimate_tokens(self, text):
        """Estimate token count using simple character-based estimation"""
        if not text:
            return 0
        
        # Simple estimation: ~4 characters per token for English text
        return len(text) // self.chars_per_token
    
    def calculate_compression_metrics(self, original_text, processed_text, processing_time):
        """Calculate compression metrics"""
        original_size = len(original_text.encode('utf-8'))
        processed_size = len(processed_text.encode('utf-8'))
        original_tokens = self.estimate_tokens(original_text)
        processed_tokens = self.estimate_tokens(processed_text)
        
        # Calculate savings
        size_savings = original_size - processed_size
        token_savings = original_tokens - processed_tokens
        
        # Calculate percentages
        size_compression_percent = (size_savings / original_size * 100) if original_size > 0 else 0
        token_compression_percent = (token_savings / original_tokens * 100) if original_tokens > 0 else 0
        
        # Calculate cost savings (assuming $0.003 per 1K tokens for Claude)
        cost_per_token = 0.003 / 1000
        cost_savings = token_savings * cost_per_token
        
        return {
            'original': {
                'size_bytes': original_size,
                'size_mb': round(original_size / (1024 * 1024), 4),
                'character_count': len(original_text),
                'token_count': original_tokens
            },
            'processed': {
                'size_bytes': processed_size,
                'size_mb': round(processed_size / (1024 * 1024), 4),
                'character_count': len(processed_text),
                'token_count': processed_tokens
            },
            'compression': {
                'size_savings_bytes': size_savings,
                'size_compression_percent': round(size_compression_percent, 2),
                'token_savings': token_savings,
                'token_compression_percent': round(token_compression_percent, 2),
                'cost_savings_usd': round(cost_savings, 6),
                'processing_time_ms': processing_time
            },
            'roi': {
                'cost_per_1000_tokens': 0.003,
                'estimated_monthly_savings': round(cost_savings * 30, 2) if cost_savings > 0 else 0,
                'payback_documents': max(1, round(0.003 / cost_savings)) if cost_savings > 0 else 0
            }
        }

# Initialize processor
processor = DocumentProcessor()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'document-processor',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/process', methods=['POST'])
def process_document():
    """Process document and return cleaned text with compression metrics"""
    
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get file info
        filename = file.filename
        file_content = file.read()
        file_size = len(file_content)
        
        logger.info(f"Processing document: {filename} ({file_size} bytes)")
        
        start_time = time.time()
        
        # Extract text based on file type
        file_extension = os.path.splitext(filename)[1].lower()
        
        if file_extension == '.pdf':
            raw_text = processor.extract_text_from_pdf(file_content)
        elif file_extension in ['.docx', '.doc']:
            raw_text = processor.extract_text_from_docx(file_content)
        else:
            return jsonify({'error': f'Unsupported file type: {file_extension}'}), 400
        
        # Clean the text
        processed_text = processor.clean_text(raw_text)
        
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Calculate metrics
        metrics = processor.calculate_compression_metrics(raw_text, processed_text, processing_time)
        
        logger.info(f"Document processed successfully. Token compression: {metrics['compression']['token_compression_percent']}%")
        
        return jsonify({
            'success': True,
            'filename': filename,
            'file_type': file_extension,
            'processed_text': processed_text,
            'metrics': metrics,
            'processing_info': {
                'processed_at': datetime.utcnow().isoformat(),
                'processor_version': '1.0.0'
            }
        })
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

@app.route('/analyze', methods=['POST'])
def analyze_text_only():
    """Analyze existing text without file processing"""
    
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        original_text = data['text']
        
        start_time = time.time()
        
        # Clean the text
        processed_text = processor.clean_text(original_text)
        
        processing_time = (time.time() - start_time) * 1000
        
        # Calculate metrics
        metrics = processor.calculate_compression_metrics(original_text, processed_text, processing_time)
        
        return jsonify({
            'success': True,
            'processed_text': processed_text,
            'metrics': metrics,
            'processing_info': {
                'processed_at': datetime.utcnow().isoformat(),
                'processor_version': '1.0.0'
            }
        })
        
    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting Document Processor API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
