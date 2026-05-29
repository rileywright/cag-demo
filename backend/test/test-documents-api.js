#!/usr/bin/env node

/**
 * Test script for Documents API
 * Run with: node test-documents-api.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Test functions
async function testHealth() {
  console.log('\n=== Testing Health Endpoint ===');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET'
    });
    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
}

async function testSessionCreate() {
  console.log('\n=== Testing Session Creation ===');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/session/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, '{}');

    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.body && response.body.data && response.body.data.sessionToken) {
      return response.body.data.sessionToken;
    }
  } catch (error) {
    console.error('Session creation failed:', error.message);
  }
  return null;
}

async function testDocumentList(sessionToken) {
  console.log('\n=== Testing Document List ===');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/documents/list',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'x-session-token': sessionToken
      }
    });

    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('Document list failed:', error.message);
  }
}

async function testDocumentUpload(sessionToken) {
  console.log('\n=== Testing Document Upload ===');
  
  // Create a simple test file
  const testContent = `
SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into on January 1, 2024 between:

1. Acme Corporation ("Client"), a company organized under the laws of California
2. Beta Services Inc ("Provider"), a company organized under the laws of Delaware

1. SERVICES
Provider shall provide software development services to Client.

2. PAYMENT
Client shall pay Provider $50,000 for the services rendered.

3. TERM
This Agreement shall commence on January 1, 2024 and continue until December 31, 2025.

4. TERMINATION
Either party may terminate this Agreement with 30 days written notice.

5. CONFIDENTIALITY
Both parties agree to keep all information confidential.

6. JURISDICTION
This Agreement shall be governed by the laws of California.
`;

  try {
    // Create multipart form data boundary
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const formData = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="document"; filename="test-agreement.txt"',
      'Content-Type: text/plain',
      '',
      testContent,
      `--${boundary}--`
    ].join('\r\n');

    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/documents/upload',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'x-session-token': sessionToken,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
      }
    }, formData);

    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.body && response.body.data && response.body.data.documentId) {
      return response.body.data.documentId;
    }
  } catch (error) {
    console.error('Document upload failed:', error.message);
  }
  return null;
}

async function testDocumentMetadata(sessionToken, documentId) {
  console.log('\n=== Testing Document Metadata ===');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/documents/${documentId}/metadata`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'x-session-token': sessionToken
      }
    });

    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('Document metadata failed:', error.message);
  }
}

async function testDocumentDelete(sessionToken, documentId) {
  console.log('\n=== Testing Document Delete ===');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/documents/${documentId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'x-session-token': sessionToken
      }
    });

    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('Document delete failed:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Documents API Tests');
  console.log('================================');

  // Test health
  await testHealth();

  // Create session
  const sessionToken = await testSessionCreate();
  if (!sessionToken) {
    console.log('❌ Failed to create session. Stopping tests.');
    return;
  }

  // Test document list (should be empty)
  await testDocumentList(sessionToken);

  // Test document upload
  const documentId = await testDocumentUpload(sessionToken);
  if (!documentId) {
    console.log('❌ Failed to upload document. Stopping tests.');
    return;
  }

  // Test document list (should show uploaded document)
  await testDocumentList(sessionToken);

  // Test document metadata
  await testDocumentMetadata(sessionToken, documentId);

  // Test document delete
  await testDocumentDelete(sessionToken, documentId);

  // Test document list (should be empty again)
  await testDocumentList(sessionToken);

  console.log('\n✅ All tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testHealth,
  testSessionCreate,
  testDocumentList,
  testDocumentUpload,
  testDocumentMetadata,
  testDocumentDelete
};
