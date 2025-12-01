#!/bin/bash

# Test script for AI Report Generator API
# Make sure the API server is running on localhost:3000

BASE_URL="http://localhost:3000/api"

echo "==================================="
echo "AI Report Generator - API Test"
echo "==================================="
echo ""

# Health check
echo "1. Health Check"
echo "-----------------------------------"
curl -s "$BASE_URL/health" | jq .
echo ""

# Create a business report
echo "2. Creating Business Report"
echo "-----------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/reports" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "type": "structured",
        "format": "json",
        "data": [
          {"month": "January", "revenue": 45000, "customers": 120, "region": "North"},
          {"month": "February", "revenue": 52000, "customers": 145, "region": "North"},
          {"month": "March", "revenue": 48000, "customers": 132, "region": "North"},
          {"month": "January", "revenue": 38000, "customers": 98, "region": "South"},
          {"month": "February", "revenue": 42000, "customers": 110, "region": "South"},
          {"month": "March", "revenue": 45000, "customers": 125, "region": "South"}
        ]
      },
      {
        "type": "unstructured",
        "format": "text",
        "content": "Q1 saw steady growth across both regions. The North region outperformed expectations while the South region showed promising improvement."
      }
    ],
    "config": {
      "title": "Q1 Regional Performance Report",
      "style": "business",
      "outputFormats": ["PDF", "HTML"]
    }
  }')

echo "$RESPONSE" | jq .
REPORT_ID=$(echo "$RESPONSE" | jq -r '.reportId')
echo ""
echo "Report ID: $REPORT_ID"
echo ""

# Check status
echo "3. Checking Report Status"
echo "-----------------------------------"
echo "Waiting 5 seconds for processing to start..."
sleep 5

curl -s "$BASE_URL/reports/$REPORT_ID" | jq .
echo ""

# Wait for completion (poll)
echo "4. Waiting for Report Completion (polling every 10s)"
echo "-----------------------------------"
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  STATUS=$(curl -s "$BASE_URL/reports/$REPORT_ID" | jq -r '.status // .workflow.status')
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "COMPLETED" ]; then
    echo "Report completed!"
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "Report failed!"
    curl -s "$BASE_URL/reports/$REPORT_ID" | jq .
    exit 1
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  sleep 10
done

echo ""

# Get final report details
echo "5. Final Report Details"
echo "-----------------------------------"
curl -s "$BASE_URL/reports/$REPORT_ID" | jq .
echo ""

# List all reports
echo "6. List All Reports"
echo "-----------------------------------"
curl -s "$BASE_URL/reports" | jq .
echo ""

echo "==================================="
echo "Test Complete!"
echo "==================================="
echo ""
echo "Download the PDF report:"
echo "  curl -o report.pdf '$BASE_URL/reports/$REPORT_ID/files?format=PDF'"
echo ""
echo "Download the HTML report:"
echo "  curl -o report.html '$BASE_URL/reports/$REPORT_ID/files?format=HTML'"

