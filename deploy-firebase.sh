#!/bin/bash

# Firebase Deployment Script for MitPlan
# This script deploys the Firebase configuration including database rules and Firestore indexes

echo "🚀 Deploying Firebase configuration for MitPlan..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Firebase CLI. Please install manually:"
        echo "   npm install -g firebase-tools"
        exit 1
    fi
fi

# Check if user is logged in to Firebase
echo "🔐 Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Firebase. Please login:"
    firebase login
    if [ $? -ne 0 ]; then
        echo "❌ Firebase login failed. Please try again."
        exit 1
    fi
fi

# Deploy Firestore rules
echo "📋 Deploying Firestore security rules..."
firebase deploy --only firestore:rules
if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi

# Deploy Firestore indexes
echo "📊 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes
if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy Firestore indexes"
    exit 1
fi

# Deploy Realtime Database rules
echo "🔄 Deploying Realtime Database rules..."
firebase deploy --only database
if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy Realtime Database rules"
    exit 1
fi

echo "✅ Firebase configuration deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Wait 1-2 minutes for indexes to build"
echo "2. Test the application at localhost:5173"
echo "3. Try creating and sharing plans"
echo "4. Test collaboration sessions"
echo ""
echo "🔗 Monitor index building progress:"
echo "   https://console.firebase.google.com/project/xivmit/firestore/indexes"
echo ""
echo "🎉 Your enhanced MitPlan collaboration system is ready!"
