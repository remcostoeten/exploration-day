#!/bin/bash

# Create results directory if it doesn't exist
mkdir -p results

# Function to display progress
show_progress() {
  local message=$1
  echo -e "\n\033[1;34m>>> $message\033[0m"
}

# Function to get memory usage of a process and its children
get_memory_usage() {
  local pid=$1
  ps --no-headers -o rss -p $pid $(pgrep -P $pid) 2>/dev/null | awk '{sum+=$1} END {print sum}'
}

# Function to measure startup time
measure_startup() {
  local package_manager=$1
  local install_command=$2
  local start_command=$3

  show_progress "Starting benchmark for $package_manager"

  # Clean up existing modules and build files
  show_progress "Cleaning up node_modules and .next directories"
  rm -rf node_modules .next

  # Force NVM to use Node.js, but don't exit if it fails
  show_progress "Switching to Node.js via NVM (ignoring version errors)"
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # Load NVM

  # Try to use Node.js 22, but continue even if it fails
  nvm use 22 2>/dev/null || nvm use 23 2>/dev/null || true

  # Verify Node version (whichever one we got)
  node_version=$(node -v)
  show_progress "Using Node.js version: $node_version"

  # Get disk space before installation
  disk_before=$(du -sm . | cut -f1)

  # Record start time for installation
  show_progress "Installing packages with $package_manager"
  install_start_time=$(date +%s.%N)

  # Run install command and capture output
  install_output=$(eval "$install_command" 2>&1)
  install_exit_code=$?

  # Record end time for installation
  install_end_time=$(date +%s.%N)
  install_duration=$(echo "$install_end_time - $install_start_time" | bc)

  # Get disk space after installation
  disk_after=$(du -sm . | cut -f1)
  disk_usage=$(($disk_after - $disk_before))

  # Count number of files in node_modules
  file_count=$(find node_modules -type f 2>/dev/null | wc -l)

  show_progress "Starting dev server with $package_manager"

  # Record start time for startup
  startup_start_time=$(date +%s.%N)

  # Run dev command and wait for "localhost:3000" in the output
  # This creates a temp file to capture the output
  temp_file=$(mktemp)

  # Start the dev server and redirect output to the temp file
  eval "$start_command > $temp_file 2>&1 &"
  server_pid=$!

  show_progress "Waiting for localhost:3000 to appear in the output"

  # Wait for "localhost:3000" to appear in the output with a spinner
  spin='-\|/'
  i=0
  localhost_found=false

  while ! $localhost_found; do
    i=$(((i + 1) % 4))
    printf "\r[%c] Waiting for server startup..." "${spin:$i:1}"

    # Check if the process is still running
    if ! ps -p $server_pid >/dev/null; then
      echo -e "\r\033[1;31m[✗] Server process died before localhost:3000 appeared\033[0m"
      show_progress "Server output:"
      cat $temp_file
      server_output=$(cat $temp_file)
      rm $temp_file

      # Create JSON with error information
      cat >"results/${package_manager}-result.json" <<EOF
{
  "packageManager": "$package_manager",
  "success": false,
  "error": "Server process died before localhost:3000 appeared",
  "installTime": $install_duration,
  "nodeVersion": "$node_version",
  "diskUsageMB": $disk_usage,
  "fileCount": $file_count,
  "installExitCode": $install_exit_code,
  "installOutput": $(echo "$install_output" | jq -Rs .),
  "serverOutput": $(echo "$server_output" | jq -Rs .)
}
EOF

      return 1
    fi

    # Check for localhost:3000
    if grep -q "localhost:3000" $temp_file; then
      localhost_found=true
    fi

    sleep 0.1
  done

  # Record end time for startup
  startup_end_time=$(date +%s.%N)
  startup_duration=$(echo "$startup_end_time - $startup_start_time" | bc)

  printf "\r\033[1;32m[✓] Server started successfully!\033[0m\n"

  # Measure memory usage
  memory_usage=$(get_memory_usage $server_pid)

  # Get CPU usage
  cpu_usage=$(ps -p $server_pid -o %cpu= 2>/dev/null)

  # Capture server output
  server_output=$(cat $temp_file)

  # Get time to first localhost:3000 mention
  time_to_ready=$(echo "$startup_duration" | bc)

  # Kill the server process
  show_progress "Stopping the server"
  kill $server_pid
  wait $server_pid 2>/dev/null

  # Total duration
  total_duration=$(echo "$install_duration + $startup_duration" | bc)

  # Clean up temp file
  rm $temp_file

  show_progress "Benchmark for $package_manager completed in $total_duration seconds"

  # Create JSON with all metrics
  cat >"results/${package_manager}-result.json" <<EOF
{
  "packageManager": "$package_manager",
  "success": true,
  "nodeVersion": "$node_version",
  "metrics": {
    "timing": {
      "installTime": $install_duration,
      "startupTime": $startup_duration,
      "totalTime": $total_duration,
      "timeToReady": $time_to_ready
    },
    "resources": {
      "diskUsageMB": $disk_usage,
      "fileCount": $file_count,
      "memoryUsageKB": $memory_usage,
      "cpuUsage": $cpu_usage
    }
  },
  "details": {
    "installExitCode": $install_exit_code,
    "installCommand": "$install_command",
    "startCommand": "$start_command",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF

  echo "$total_duration"
  return 0
}

show_progress "Starting package manager benchmark"

# Make sure jq is available
if ! command -v jq &>/dev/null; then
  echo "jq is required for JSON processing. Please install it."
  echo "Debian/Ubuntu: sudo apt-get install jq"
  echo "Red Hat/CentOS: sudo yum install jq"
  echo "macOS: brew install jq"
  exit 1
fi

# Run benchmarks
yarn_time=$(measure_startup "yarn" "yarn" "yarn dev")
pnpm_time=$(measure_startup "pnpm" "pnpm install" "pnpm dev")
bun_time=$(measure_startup "bun" "bun install" "bun run dev")

# Create combined JSON results
show_progress "Generating combined results"

# Combine individual result files
jq -s '{
  "results": .,
  "summary": {
    "fastest": (min_by(.metrics.timing.totalTime) | .packageManager),
    "lowestMemory": (min_by(.metrics.resources.memoryUsageKB) | .packageManager),
    "smallestDiskUsage": (min_by(.metrics.resources.diskUsageMB) | .packageManager),
    "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"
  }
}' results/yarn-result.json results/pnpm-result.json results/bun-result.json >results/benchmark-results.json

# Print results
show_progress "Results saved to results/benchmark-results.json"
echo -e "\n\033[1;32m===== BENCHMARK SUMMARY =====\033[0m"
echo -e "Yarn: \033[1;33m$yarn_time seconds\033[0m"
echo -e "PNPM: \033[1;33m$pnpm_time seconds\033[0m"
echo -e "Bun: \033[1;33m$bun_time seconds\033[0m"
echo -e "\033[1;32m============================\033[0m"

# Display fastest package manager
fastest=$(jq -r '.summary.fastest' results/benchmark-results.json)
echo -e "\n\033[1;36mFastest Package Manager: \033[1;33m$fastest\033[0m"

show_progress "Benchmark completed!"
