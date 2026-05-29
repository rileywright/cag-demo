# Test script for Documents API
# Run with: .\test-documents-api.ps1

$BASE_URL = "http://localhost:3001"

# Helper function to make HTTP requests
function Invoke-ApiRequest {
    param(
        [string]$Path,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    try {
        $params = @{
            Uri = "$BASE_URL$Path"
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params -UseBasicParsing
        $content = $response.Content | ConvertFrom-Json
        
        return @{
            StatusCode = $response.StatusCode
            Content = $content
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $content = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        return @{
            StatusCode = $statusCode
            Content = $content
            Error = $_.Exception.Message
        }
    }
}

# Test functions
function Test-Health {
    Write-Host "`n=== Testing Health Endpoint ===" -ForegroundColor Cyan
    try {
        $response = Invoke-ApiRequest -Path "/api/health"
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content | ConvertTo-Json -Depth 10)" -ForegroundColor Yellow
    }
    catch {
        Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Test-SessionCreate {
    Write-Host "`n=== Testing Session Creation ===" -ForegroundColor Cyan
    try {
        $response = Invoke-ApiRequest -Path "/api/session/create" -Method "POST" -Body "{}"
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content | ConvertTo-Json -Depth 10)" -ForegroundColor Yellow
        
        if ($response.Content.data -and $response.Content.data.sessionToken) {
            return $response.Content.data.sessionToken
        }
    }
    catch {
        Write-Host "Session creation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    return $null
}

function Test-DocumentList {
    param([string]$SessionToken)
    
    Write-Host "`n=== Testing Document List ===" -ForegroundColor Cyan
    try {
        $headers = @{
            "Authorization" = "Bearer $SessionToken"
            "x-session-token" = $SessionToken
        }
        
        $response = Invoke-ApiRequest -Path "/api/documents/list" -Headers $headers
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content | ConvertTo-Json -Depth 10)" -ForegroundColor Yellow
    }
    catch {
        Write-Host "Document list failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Test-DocumentUpload {
    param([string]$SessionToken)
    
    Write-Host "`n=== Testing Document Upload ===" -ForegroundColor Cyan
    
    # Create a simple test file
    $testContent = @"
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
"@
    
    try {
        # Create temporary file
        $tempFile = [System.IO.Path]::GetTempFileName()
        $tempFile = $tempFile.Replace(".tmp", ".txt")
        $testContent | Out-File -FilePath $tempFile -Encoding UTF8
        
        $headers = @{
            "Authorization" = "Bearer $SessionToken"
            "x-session-token" = $SessionToken
        }
        
        $form = @{
            document = Get-Item $tempFile
        }
        
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/documents/upload" -Method POST -Form $form -Headers $headers
        
        Write-Host "Status: 200" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json -Depth 10)" -ForegroundColor Yellow
        
        # Clean up
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        
        if ($response.data -and $response.data.documentId) {
            return $response.data.documentId
        }
    }
    catch {
        Write-Host "Document upload failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    return $null
}

function Test-DocumentMetadata {
    param(
        [string]$SessionToken,
        [string]$DocumentId
    )
    
    Write-Host "`n=== Testing Document Metadata ===" -ForegroundColor Cyan
    try {
        $headers = @{
            "Authorization" = "Bearer $SessionToken"
            "x-session-token" = $SessionToken
        }
        
        $response = Invoke-ApiRequest -Path "/api/documents/$DocumentId/metadata" -Headers $headers
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content | ConvertTo-Json -Depth 10)" -ForegroundColor Yellow
    }
    catch {
        Write-Host "Document metadata failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Test-DocumentDelete {
    param(
        [string]$SessionToken,
        [string]$DocumentId
    )
    
    Write-Host "`n=== Testing Document Delete ===" -ForegroundColor Cyan
    try {
        $headers = @{
            "Authorization" = "Bearer $SessionToken"
            "x-session-token" = $SessionToken
        }
        
        $response = Invoke-ApiRequest -Path "/api/documents/$DocumentId" -Method "DELETE" -Headers $headers
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content | ConvertTo-Json -Depth 10)" -ForegroundColor Yellow
    }
    catch {
        Write-Host "Document delete failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main test function
function Run-DocumentTests {
    Write-Host "🚀 Starting Documents API Tests" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green

    # Test health
    Test-Health

    # Create session
    $sessionToken = Test-SessionCreate
    if (-not $sessionToken) {
        Write-Host "❌ Failed to create session. Stopping tests." -ForegroundColor Red
        return
    }

    # Test document list (should be empty)
    Test-DocumentList -SessionToken $sessionToken

    # Test document upload
    $documentId = Test-DocumentUpload -SessionToken $sessionToken
    if (-not $documentId) {
        Write-Host "❌ Failed to upload document. Stopping tests." -ForegroundColor Red
        return
    }

    # Test document list (should show uploaded document)
    Test-DocumentList -SessionToken $sessionToken

    # Test document metadata
    Test-DocumentMetadata -SessionToken $sessionToken -DocumentId $documentId

    # Test document delete
    Test-DocumentDelete -SessionToken $sessionToken -DocumentId $documentId

    # Test document list (should be empty again)
    Test-DocumentList -SessionToken $sessionToken

    Write-Host "`n✅ All tests completed!" -ForegroundColor Green
}

# Run tests
Run-DocumentTests
