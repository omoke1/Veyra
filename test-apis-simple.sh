#!/bin/bash

# Simple API test script
INDEXER_URL="${INDEXER_URL:-http://localhost:4001}"
WEB_API_URL="${WEB_API_URL:-http://localhost:3000}"

echo "🧪 API Functionality Test Suite"
echo "=================================================="

# Test Indexer API
echo ""
echo "📡 Testing Indexer API..."
if curl -s "${INDEXER_URL}/health" > /dev/null 2>&1; then
    echo "   ✅ Indexer is running"
    
    # Test endpoints
    MARKETS=$(curl -s "${INDEXER_URL}/markets" | jq '. | length' 2>/dev/null || echo "0")
    EXTERNAL=$(curl -s "${INDEXER_URL}/external-markets" | jq '. | length' 2>/dev/null || echo "0")
    ADAPTER=$(curl -s "${INDEXER_URL}/adapter-requests" | jq '. | length' 2>/dev/null || echo "0")
    
    echo "   📊 Markets: $MARKETS"
    echo "   📊 External Markets: $EXTERNAL"
    echo "   📊 Adapter Requests: $ADAPTER"
    
    # Check by source
    POLY=$(curl -s "${INDEXER_URL}/external-markets?source=Polymarket" | jq '. | length' 2>/dev/null || echo "0")
    UMA=$(curl -s "${INDEXER_URL}/external-markets?source=UMA" | jq '. | length' 2>/dev/null || echo "0")
    GNOSIS=$(curl -s "${INDEXER_URL}/external-markets?source=Gnosis" | jq '. | length' 2>/dev/null || echo "0")
    
    echo "   📊 Polymarket: $POLY"
    echo "   📊 UMA: $UMA"
    echo "   📊 Gnosis: $GNOSIS"
else
    echo "   ❌ Indexer is not running on ${INDEXER_URL}"
fi

# Test Web API
echo ""
echo "🌐 Testing Web API..."
if curl -s "${WEB_API_URL}/api/health" > /dev/null 2>&1; then
    echo "   ✅ Web API is running"
    
    WEB_MARKETS=$(curl -s "${WEB_API_URL}/api/markets" | jq '. | length' 2>/dev/null || echo "0")
    WEB_EXTERNAL=$(curl -s "${WEB_API_URL}/api/external-markets" | jq '. | length' 2>/dev/null || echo "0")
    
    echo "   📊 Markets: $WEB_MARKETS"
    echo "   📊 External Markets: $WEB_EXTERNAL"
else
    echo "   ❌ Web API is not running on ${WEB_API_URL}"
fi

# Test Polymarket API directly
echo ""
echo "📊 Testing Polymarket API..."
POLY_API="https://gamma-api.polymarket.com/markets?limit=5&active=true"
if curl -s "$POLY_API" > /dev/null 2>&1; then
    POLY_COUNT=$(curl -s "$POLY_API" | jq '. | length' 2>/dev/null || echo "0")
    echo "   ✅ Polymarket Gamma API accessible: $POLY_COUNT markets"
else
    echo "   ⚠️  Polymarket Gamma API not accessible"
fi

# Test Polymarket Subgraph
echo ""
echo "📊 Testing Polymarket Subgraph..."
SUBGRAPH_URL="https://api.thegraph.com/subgraphs/name/polymarket/polymarket"
SUBGRAPH_QUERY='{"query":"{ markets(first: 5, where: { active: true }) { id question } }"}'
if curl -s -X POST -H "Content-Type: application/json" -d "$SUBGRAPH_QUERY" "$SUBGRAPH_URL" > /dev/null 2>&1; then
    SUBGRAPH_COUNT=$(curl -s -X POST -H "Content-Type: application/json" -d "$SUBGRAPH_QUERY" "$SUBGRAPH_URL" | jq '.data.markets | length' 2>/dev/null || echo "0")
    echo "   ✅ Polymarket Subgraph accessible: $SUBGRAPH_COUNT markets"
else
    echo "   ⚠️  Polymarket Subgraph not accessible"
fi

echo ""
echo "=================================================="
echo "✅ Test complete"





