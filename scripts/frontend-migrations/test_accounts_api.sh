#!/bin/bash

# Login and get token
echo "📝 Logging in..."
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@bdesktravel.com","password":"Body@2017"}')

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$TOKEN_RESPONSE" | python3 -m json.tool
  exit 1
fi

echo "✅ Login successful!"
echo ""

# Get accounts
echo "📊 Fetching accounts..."
curl -s -X GET "http://localhost:3001/api/accounts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool

