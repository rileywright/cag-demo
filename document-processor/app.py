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
        """Advanced text cleaning for maximum compression"""
        if not text:
            return ""
        
        # Phase 1: Remove document structure artifacts
        text = self._remove_document_artifacts(text)
        
        # Phase 2: Normalize whitespace
        text = self._normalize_whitespace(text)
        
        # Phase 3: Remove redundant content
        text = self._remove_redundant_content(text)
        
        # Phase 4: Optimize legal document structure
        text = self._optimize_legal_structure(text)
        
        # Phase 5: Final cleanup
        text = self._final_cleanup(text)
        
        return text.strip()
    
    def _remove_document_artifacts(self, text):
        """Remove headers, footers, page numbers, and formatting artifacts"""
        # Page numbers and pagination
        text = re.sub(r'Page \d+ of \d+', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Page \d+', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\d+ of \d+', '', text)
        text = re.sub(r'\f', '', text)  # Form feeds
        
        # Headers and footers (common patterns)
        text = re.sub(r'^.*?CONFIDENTIAL.*?$', '', text, flags=re.MULTILINE | re.IGNORECASE)
        text = re.sub(r'^.*?DRAFT.*?$', '', text, flags=re.MULTILINE | re.IGNORECASE)
        text = re.sub(r'^.*?Page \d+.*?$', '', text, flags=re.MULTILINE | re.IGNORECASE)
        
        # File paths and URLs
        text = re.sub(r'\b\w:[\\\/][\w\\\/.-]*', '', text)  # Windows paths
        text = re.sub(r'\b\/[\w\/.-]*', '', text)  # Unix paths
        text = re.sub(r'https?:\/\/[\w\.-\/\?=&%]+', '', text)  # URLs
        
        # Email addresses
        text = re.sub(r'\b[\w\.-]+@[\w\.-]+\.\w+\b', '', text)
        
        # Phone numbers
        text = re.sub(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', '', text)
        text = re.sub(r'\b\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b', '', text)
        
        return text
    
    def _normalize_whitespace(self, text):
        """Normalize all whitespace to single spaces"""
        # Replace tabs and multiple spaces with single space
        text = re.sub(r'[ \t]+', ' ', text)
        
        # Replace multiple newlines with single newline
        text = re.sub(r'\n\s*\n+', '\n', text)
        
        # Remove leading/trailing whitespace from lines
        text = '\n'.join(line.strip() for line in text.split('\n'))
        
        return text
    
    def _remove_redundant_content(self, text):
        """Remove redundant and repetitive content"""
        # Remove duplicate consecutive lines
        lines = text.split('\n')
        cleaned_lines = []
        prev_line = None
        
        for line in lines:
            if line.strip() and line.strip() != prev_line:
                cleaned_lines.append(line)
                prev_line = line.strip()
            elif not line.strip():  # Keep blank lines for structure
                cleaned_lines.append(line)
                prev_line = None
        
        text = '\n'.join(cleaned_lines)
        
        # Remove repetitive legal boilerplate
        boilerplate_patterns = [
            r'This agreement is made and entered into.*?\.',
            r'IN WITNESS WHEREOF.*?have executed this agreement.*?\.',
            r'All rights reserved.*?\.',
            r'Copyright © \d{4}.*?All rights reserved',
            r'Confidential.*?proprietary.*?information',
            r'Terms and Conditions.*?effective date',
            r'Please read.*?carefully.*?terms',
        ]
        
        for pattern in boilerplate_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove excessive punctuation
        text = re.sub(r'[.]{3,}', '.', text)  # Multiple periods
        text = re.sub(r'[!?]{2,}', '!', text)  # Multiple exclamation/question marks
        
        return text
    
    def _optimize_legal_structure(self, text):
        """Optimize legal document structure for compression"""
        # Standardize section numbering
        text = re.sub(r'^(\d+\.?\s*)', r'\1', text, flags=re.MULTILINE)
        text = re.sub(r'^([A-Za-z]\.?\s*)', r'\1', text, flags=re.MULTILINE)
        
        # Remove empty numbered sections
        text = re.sub(r'^\d+\.\s*\n', '', text, flags=re.MULTILINE)
        text = re.sub(r'^[A-Za-z]\.\s*\n', '', text, flags=re.MULTILINE)
        
        # Consolidate short lines (likely fragments)
        lines = text.split('\n')
        consolidated_lines = []
        
        for i, line in enumerate(lines):
            if len(line.strip()) < 30 and i > 0:  # Short line, likely fragment
                # Append to previous line if it's not too long
                if len(consolidated_lines[-1]) < 100:
                    consolidated_lines[-1] += ' ' + line.strip()
                else:
                    consolidated_lines.append(line)
            else:
                consolidated_lines.append(line)
        
        text = '\n'.join(consolidated_lines)
        
        # Remove common legal phrases that don't add value
        legal_noise_patterns = [
            r'hereby agrees to',
            r'shall be deemed to',
            r'including but not limited to',
            r'without limitation',
            r'including, without limitation',
            r'for the avoidance of doubt',
            r'it is understood and agreed',
            r'notwithstanding the foregoing',
            r'subject to the foregoing',
        ]
        
        for pattern in legal_noise_patterns:
            text = re.sub(r'\b' + pattern + r'\b', '', text, flags=re.IGNORECASE)
        
        return text
    
    def _final_cleanup(self, text):
        """Final cleanup and optimization"""
        # Remove bullet points and numbering (after structure optimization)
        text = re.sub(r'^\s*[\•\-\*\d]+\.\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^\s*\([a-z]\)\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^\s*\([A-Z]\)\s*', '', text, flags=re.MULTILINE)
        
        # Clean up spacing around punctuation
        text = re.sub(r'\s+([,.!?;:])', r'\1', text)
        text = re.sub(r'([,.!?;:])\s+', r'\1 ', text)
        
        # Remove single-character lines
        text = '\n'.join(line for line in text.split('\n') if len(line.strip()) > 1)
        
        # Final whitespace cleanup
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)  # Max 2 consecutive newlines
        text = re.sub(r' +', ' ', text)  # Single spaces only
        
        return text
    
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
