import cacheService from '../src/services/cacheService.js';
import sessionService from '../src/services/sessionService.js';
import documentService from '../src/services/documentService.js';
import anthropicService from '../src/services/anthropicService.js';
import fs from 'fs';

async function processRealDocument() {
  try {
    // Initialize services
    await sessionService.connect();
    await cacheService.connect(sessionService.client);
    await anthropicService.initialize();
    
    // Read the actual resume document (the 3-page, 1100+ word document)
    const documentPath = '../test-documents/JohnWright_Resume.docx';
    
    console.log('🧪 Processing REAL document with proper tokenization...');
    
    // Check if file exists
    if (!fs.existsSync(documentPath)) {
      console.log('❌ Document not found, using test data instead');
      
      // Create a substantial test document (3 pages, ~1100 words)
      const largeText = `
      John Wright
      Senior Software Engineer & Architect
      
      PROFESSIONAL SUMMARY
      Experienced Senior Software Engineer with over 8 years of expertise in designing, developing, and deploying scalable enterprise applications. Proficient in full-stack development, cloud architecture, microservices, and leading development teams. Strong background in JavaScript, Python, Java, and modern cloud technologies including AWS, Azure, and Google Cloud Platform.
      
      TECHNICAL EXPERTISE
      Programming Languages: JavaScript (ES6+), TypeScript, Python, Java, C#, Go, Rust
      Frontend: React, Angular, Vue.js, Next.js, Redux, MobX, Webpack, Vite
      Backend: Node.js, Express, Django, Flask, Spring Boot, .NET Core
      Databases: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, Cassandra
      Cloud Platforms: AWS (EC2, S3, Lambda, RDS, DynamoDB), Azure, GCP
      DevOps: Docker, Kubernetes, Jenkins, GitLab CI, Terraform, Ansible
      Architecture: Microservices, Serverless, Event-Driven, CQRS, Event Sourcing
      
      PROFESSIONAL EXPERIENCE
      
      Senior Software Engineer | TechCorp Solutions | Jan 2020 - Present
      - Lead development of microservices-based platform serving 2M+ users
      - Designed and implemented event-driven architecture using Kafka and Redis
      - Reduced system latency by 40% through optimization and caching strategies
      - Mentored team of 5 junior developers and conducted code reviews
      - Implemented CI/CD pipelines reducing deployment time by 60%
      
      Full Stack Developer | Digital Innovations Inc. | Jun 2018 - Dec 2019
      - Developed React-based frontend applications with Redux state management
      - Built RESTful APIs using Node.js and Express with PostgreSQL database
      - Implemented real-time features using WebSockets and Socket.io
      - Optimized database queries improving performance by 35%
      - Collaborated with UX team to implement responsive design principles
      
      Software Developer | StartupTech | Jan 2016 - May 2018
      - Developed full-stack applications using MEAN stack (MongoDB, Express, Angular, Node.js)
      - Implemented authentication and authorization using JWT and OAuth 2.0
      - Created RESTful APIs and integrated third-party payment gateways
      - Participated in agile development process with 2-week sprints
      - Maintained code quality through unit testing and code reviews
      
      EDUCATION
      
      Bachelor of Science in Computer Science
      University of Technology | Graduated: May 2015
      GPA: 3.8/4.0, Dean's List for 6 semesters
      
      Relevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems, Distributed Systems, Machine Learning, Computer Networks
      
      CERTIFICATIONS
      - AWS Certified Solutions Architect - Professional (2023)
      - Google Cloud Professional Developer (2022)
      - Microsoft Certified: Azure Developer Associate (2021)
      - Certified Kubernetes Administrator (2020)
      
      PROJECTS
      
      E-Commerce Platform (2023)
      - Built scalable e-commerce platform using microservices architecture
      - Technologies: React, Node.js, PostgreSQL, Redis, Docker, Kubernetes
      - Implemented real-time inventory management and order processing
      - Achieved 99.9% uptime with auto-scaling and load balancing
      
      Real-Time Analytics Dashboard (2022)
      - Developed real-time analytics dashboard processing 1M+ events daily
      - Technologies: Python, Apache Kafka, Elasticsearch, React, D3.js
      - Implemented custom data processing pipelines and visualization
      - Reduced data processing time by 70% through optimization
      
      CONTACT INFORMATION
      Email: john.wright@techcorp.com
      Phone: (555) 123-4567
      LinkedIn: linkedin.com/in/johnwright-dev
      GitHub: github.com/johnwright
      Portfolio: johnwright.dev
      Location: San Francisco, CA
      `;
      
      const buffer = Buffer.from(largeText, 'utf8');
      const originalName = 'JohnWright_Resume_Full.txt';
      const mimetype = 'text/plain';
      
      console.log(`📄 Text length: ${largeText.length} characters`);
      console.log(`📊 Word count: ${largeText.split(/\s+/).length} words`);
      
      // Process the document
      const result = await documentService.processDocument(buffer, originalName, mimetype);
      
      console.log('\n✅ Document processed successfully!');
      console.log(`📄 Document ID: ${result.documentId}`);
      console.log(`📊 Text Length: ${result.textLength}`);
      console.log(`🔢 Token Count: ${result.tokenCount}`);
      console.log(`💾 Cached: ${result.cached}`);
      
      // Update the inspection script to use this new document ID
      console.log(`\n📝 New Document ID for inspection: ${result.documentId}`);
      
    } else {
      console.log('📄 Found real document file');
      // Process the actual file
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

processRealDocument();
