#!/bin/bash

# Real-Time Collaboration Testing Script for MitPlan
# This script runs comprehensive tests for Firebase Realtime Database integration

set -e

echo "🚀 Starting MitPlan Real-Time Collaboration Tests"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v bun &> /dev/null; then
        print_error "Bun is not installed. Please install Bun first."
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        print_error "npx is not installed. Please install Node.js first."
        exit 1
    fi
    
    print_success "All dependencies are available"
}

# Install dependencies if needed
install_dependencies() {
    print_status "Installing dependencies..."
    bun install
    print_success "Dependencies installed"
}

# Start the development server
start_dev_server() {
    print_status "Starting development server..."
    
    # Check if server is already running
    if curl -s http://localhost:5174 > /dev/null 2>&1; then
        print_warning "Development server is already running on port 5174"
        return 0
    fi
    
    # Start server in background
    bun run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to be ready
    print_status "Waiting for development server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:5174 > /dev/null 2>&1; then
            print_success "Development server is ready"
            return 0
        fi
        sleep 2
    done
    
    print_error "Development server failed to start"
    exit 1
}

# Stop the development server
stop_dev_server() {
    if [ ! -z "$DEV_SERVER_PID" ]; then
        print_status "Stopping development server..."
        kill $DEV_SERVER_PID 2>/dev/null || true
        wait $DEV_SERVER_PID 2>/dev/null || true
        print_success "Development server stopped"
    fi
}

# Run specific test suites
run_basic_collaboration_tests() {
    print_status "Running basic collaboration tests..."
    npx playwright test tests/e2e/basic-collaboration.spec.js --reporter=list
    print_success "Basic collaboration tests completed"
}

run_realtime_collaboration_tests() {
    print_status "Running real-time collaboration tests..."
    npx playwright test tests/e2e/real-time-collaboration.spec.js --reporter=list
    print_success "Real-time collaboration tests completed"
}

run_integration_tests() {
    print_status "Running collaboration integration tests..."
    npx playwright test tests/e2e/collaboration-integration.spec.js --reporter=list
    print_success "Integration tests completed"
}

run_all_collaboration_tests() {
    print_status "Running all collaboration tests..."
    npx playwright test tests/e2e/share-link-collaboration.spec.js tests/e2e/real-time-collaboration.spec.js tests/e2e/collaboration-integration.spec.js --reporter=html --reporter=list
    print_success "All collaboration tests completed"
}

# Run tests with specific browser
run_tests_with_browser() {
    local browser=$1
    print_status "Running collaboration tests with $browser..."
    npx playwright test tests/e2e/collaboration-integration.spec.js --project=$browser --reporter=list
    print_success "$browser tests completed"
}

# Run performance tests
run_performance_tests() {
    print_status "Running collaboration performance tests..."
    npx playwright test tests/e2e/collaboration-integration.spec.js --grep="Performance and Scalability" --reporter=list
    print_success "Performance tests completed"
}

# Generate test report
generate_report() {
    print_status "Generating test report..."
    npx playwright show-report tests/reports/html
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    stop_dev_server
    
    # Kill any remaining processes
    pkill -f "playwright" 2>/dev/null || true
    pkill -f "chromium" 2>/dev/null || true
    pkill -f "firefox" 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    local test_type=${1:-"all"}
    local browser=${2:-"chromium"}
    
    print_status "Test type: $test_type"
    print_status "Browser: $browser"
    
    check_dependencies
    install_dependencies
    start_dev_server
    
    case $test_type in
        "basic")
            run_basic_collaboration_tests
            ;;
        "realtime")
            run_realtime_collaboration_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "browser")
            run_tests_with_browser $browser
            ;;
        "all")
            run_all_collaboration_tests
            ;;
        "report")
            generate_report
            ;;
        *)
            print_error "Unknown test type: $test_type"
            echo "Available options: basic, realtime, integration, performance, browser, all, report"
            exit 1
            ;;
    esac
    
    print_success "🎉 All tests completed successfully!"
    print_status "Test artifacts are available in tests/artifacts/"
    print_status "Test reports are available in tests/reports/"
}

# Help function
show_help() {
    echo "MitPlan Real-Time Collaboration Test Runner"
    echo ""
    echo "Usage: $0 [test_type] [browser]"
    echo ""
    echo "Test Types:"
    echo "  basic       - Run basic share link collaboration tests"
    echo "  realtime    - Run real-time collaboration tests"
    echo "  integration - Run collaboration integration tests"
    echo "  performance - Run performance and scalability tests"
    echo "  browser     - Run tests with specific browser"
    echo "  all         - Run all collaboration tests (default)"
    echo "  report      - Show test report"
    echo ""
    echo "Browsers:"
    echo "  chromium    - Google Chrome/Chromium (default)"
    echo "  firefox     - Mozilla Firefox"
    echo "  webkit      - Safari WebKit"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests with Chromium"
    echo "  $0 basic              # Run basic tests only"
    echo "  $0 browser firefox    # Run tests with Firefox"
    echo "  $0 performance        # Run performance tests only"
    echo "  $0 report             # Show test report"
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@"
