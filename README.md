# Legal CAG Demo - Cache Augmented Generation System

## Overview
A secure, enterprise-grade Cache Augmented Generation (CAG) system for legal contract analysis. This demo showcases significant cost savings over traditional RAG systems and manual legal review.

## Business Value
- **80%+ cost reduction** vs manual attorney review
- **70%+ cost savings** vs traditional RAG systems
- **Sub-second response times** for cached queries
- **Zero data retention** - security-first architecture

## Architecture

### Backend (Node.js)
- **Express.js** with security middleware
- **Redis** for encrypted caching
- **Anthropic Claude Haiku 4.5** for cost-effective AI responses
- **SQLite** for analytics and cost tracking
- **pdf-parse** for document processing

### Frontend (React + Vite)
- **Material-UI** for professional legal interface
- **React-dropzone** for document uploads
- **Real-time cost calculator**
- **RAG vs CAG comparison toggle**

### Security Features
- Zero document persistence
- In-memory processing only
- AES-256 encryption for cache
- Session isolation
- Auto-purge after 30 minutes
- Full audit logging

## Directory Structure

```
cag-demo/
├── README.md
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Security & validation
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API endpoints
│   │   ├── utils/           # Helper functions
│   │   └── app.js           # Express app setup
│   ├── test/                # Backend tests
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API calls
│   │   ├── utils/           # Helper functions
│   │   └── App.jsx          # Main app
│   ├── test/                # Frontend tests
│   ├── package.json
│   └── vite.config.js
└── docs/
    └── api.md               # API documentation
```

## Key Features

### Document Processing
- Upload legal contracts (PDF)
- Automatic text extraction
- Semantic chunking for analysis
- Session-based processing

### Query System
- Natural language questions
- Context-aware responses
- Real-time cost tracking
- Performance metrics

### Cost Analytics
- Per-query cost breakdown
- CAG vs RAG comparison
- ROI calculations
- Session savings summary

## Implementation Roadmap

### Phase 1: Security Foundation ✅ COMPLETED
- [x] Security middleware setup (Helmet, CORS, Rate Limiting)
- [x] Environment validation with Joi
- [x] Secure error handling and logging
- [x] Request size limits and validation
- [x] Express app with security-first configuration

### Phase 2: Session Management (In Progress)
- [ ] JWT-based session tokens
- [ ] Redis session storage
- [ ] Session cleanup mechanisms
- [ ] Session isolation per user

### Phase 3: Document Processing (Next)
- [ ] Secure file upload middleware
- [ ] PDF parsing and text extraction
- [ ] File validation (type, size, content)
- [ ] Memory-only processing

### Phase 4: CAG Core Logic
- [ ] Cache service implementation
- [ ] Anthropic API integration
- [ ] Query hashing for cache keys
- [ ] Cost tracking and analytics

### Phase 5: API Endpoints
- [ ] Document upload endpoint
- [ ] Q&A with CAG endpoint
- [ ] Cost breakdown endpoint
- [ ] Session management endpoints

### Phase 6: Frontend Development
- [ ] React app setup with Vite
- [ ] Document upload interface
- [ ] Q&A interface with cost tracking
- [ ] RAG vs CAG comparison

### Phase 7: Demo Enhancement
- [ ] Sample legal documents
- [ ] Pre-cached common queries
- [ ] Export functionality
- [ ] Performance optimization

## Sample Use Cases

### Contract Analysis
- "What are the key risks in this contract?"
- "Is the indemnification clause standard?"
- "Does this comply with California law?"

### Cost Comparison Examples
- **Manual Review**: $250 (30 minutes @ $500/hr)
- **RAG System**: $2.45 (embedding + search + API)
- **CAG System**: $0.03 (cached response with Haiku 4.5)

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **Redis** server (local or Docker)
- **npm** or **yarn**

### Redis Setup
```bash
# Start Redis with Docker (recommended)
docker-compose up -d redis

# Verify Redis is running
docker-compose exec redis redis-cli ping
```

### Development Setup
1. **Clone repository**
2. **Start Redis**: `docker-compose up -d redis`
3. **Install backend dependencies**: `cd backend && npm install`
4. **Install frontend dependencies**: `cd frontend && npm install`
5. **Configure environment variables**
6. **Start development servers**

## Environment Variables

### Backend (.env)
```
ANTHROPIC_API_KEY=your_anthropic_api_key
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3001
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

## Security Considerations

- No documents are stored persistently
- All processing happens in memory
- Cache data is encrypted
- Sessions auto-expire after 30 minutes
- Full audit trail maintained

## Performance Targets

- **Cache hit rate**: >60% on common queries
- **Response time**: <2 seconds for cached queries
- **Security**: Zero data persistence
- **Uptime**: 99.9% availability

## Contributing

This is a proof-of-concept demo. Focus on security, performance, and clear ROI demonstration.

## License

MIT License - Demo purposes only.
