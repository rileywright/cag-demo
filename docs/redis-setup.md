# Redis Setup for CAG Demo

## Quick Start (Docker - Recommended)

### 1. Start Redis Container
```bash
docker-compose up -d redis
```

### 2. Verify Redis is Running
```bash
docker-compose exec redis redis-cli ping
# Should return: PONG
```

### 3. Stop Redis
```bash
docker-compose down redis
```

## Alternative Setup Options

### Option 1: Docker Desktop (Manual)
1. Open Docker Desktop
2. Run: `docker run --name redis-cag -p 6379:6379 -d redis:7-alpine`
3. Verify: `docker exec redis-cag redis-cli ping`

### Option 2: WSL (Ubuntu/Debian)
```bash
# Install WSL first if not available
wsl --install -d Ubuntu

# In WSL terminal
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping
```

### Option 3: Redis for Windows (Memurai)
1. Download from: https://www.memurai.com/
2. Install Memurai
3. Start Memurai service
4. Test: `memurai-cli ping`

## Redis Configuration for CAG

### Environment Variables (already in .env.example)
```
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
```

### Redis Settings Used by CAG
- **Port**: 6379 (default)
- **Password**: None (development)
- **Database**: 0 (default)
- **TTL**: 30 minutes (1800 seconds) for cache entries
- **Max Memory**: Configurable for production

## Testing Redis Connection

### Backend Test Script
```javascript
// test-redis.js
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => {
  console.error('Redis Error:', err);
});

client.on('connect', () => {
  console.log('Connected to Redis!');
});

async function testRedis() {
  await client.connect();
  
  // Test set/get
  await client.set('test-key', 'test-value', { EX: 60 });
  const value = await client.get('test-key');
  console.log('Test value:', value);
  
  await client.quit();
}

testRedis().catch(console.error);
```

## Redis Data Structure for CAG

### Cache Key Format
```
cag:query:{hash}           // Query cache
cag:session:{sessionId}     // Session data
cag:analytics:daily:{date}  // Daily analytics
```

### Cache Entry Structure
```json
{
  "query": "What are the key risks?",
  "response": "...",
  "timestamp": "2024-01-01T12:00:00Z",
  "sessionId": "abc123",
  "cost": 0.12,
  "ttl": 1800
}
```

## Troubleshooting

### Common Issues
1. **Port 6379 in use**: Change port in docker-compose.yml
2. **Connection refused**: Ensure Redis container is running
3. **Permission denied**: Check Docker permissions
4. **WSL issues**: Restart WSL service

### Redis Commands for Debugging
```bash
# Check all keys
redis-cli KEYS "*"

# Check specific key
redis-cli GET cag:query:abc123

# Clear all data (development only)
redis-cli FLUSHALL

# Monitor Redis activity
redis-cli MONITOR
```

## Production Considerations

### Security
- Set Redis password
- Use TLS/SSL
- Network isolation
- Regular backups

### Performance
- Configure max memory policy
- Monitor memory usage
- Set appropriate TTL values
- Use Redis clustering for scale
