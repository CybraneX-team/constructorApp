#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Android Release Build...\n');

// Check if EAS CLI is installed
try {
  execSync('eas --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ EAS CLI is not installed. Please install it first:');
  console.error('npm install -g @expo/eas-cli');
  process.exit(1);
}

// Check if user is logged in to EAS
try {
  execSync('eas whoami', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Please log in to EAS first:');
  console.error('eas login');
  process.exit(1);
}

console.log('✅ EAS CLI is ready\n');

// Build the Android APK
try {
  console.log('📱 Building Android Release APK...');
  console.log('This may take 10-15 minutes...\n');
  
  execSync('eas build --platform android --profile production', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('\n✅ Android Release APK build completed successfully!');
  console.log('📦 The APK file will be available in your EAS dashboard');
  console.log('🔗 Check: https://expo.dev/accounts/cybranex/projects/voiceai/builds');
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
