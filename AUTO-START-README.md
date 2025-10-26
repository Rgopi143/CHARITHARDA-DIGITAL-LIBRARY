# Auto-Start Server Setup Guide

This guide explains how to configure your Digital Library server to start automatically when Windows boots up.

## Files Created

1. **start-server.bat** - Batch script that starts the server
2. **install-autostart.bat** - Installs the auto-start task in Windows Task Scheduler
3. **remove-autostart.bat** - Removes the auto-start task

## Setup Instructions

### Step 1: Enable Auto-Start

1. Right-click on `install-autostart.bat`
2. Select **"Run as administrator"**
3. Follow the prompts

This will create a Windows Task Scheduler entry that runs the server automatically when you log in.

### Step 2: Verify Installation

The server will start automatically the next time you log in to Windows. To verify:

1. Open Windows Task Scheduler (search for "Task Scheduler" in Start menu)
2. Look for a task named "Digital Library Server"
3. Ensure it's enabled and set to run "At log on"

### Manual Server Control

**To start the server manually:**
- Double-click `start-server.bat`

**To stop the server:**
- Open Task Manager (Ctrl+Shift+Esc)
- Find "node.exe" process
- Right-click and select "End Task"

**To disable auto-start:**
- Double-click `remove-autostart.bat`
- Or manually delete the task from Task Scheduler

## Server Information

- **Port:** 3001 (default)
- **MongoDB:** Uses MongoDB URI from `.env` file
- **Database:** digital-library (default)

## Troubleshooting

### Server doesn't start automatically
- Ensure you ran `install-autostart.bat` as Administrator
- Check Task Scheduler to see if the task exists and is enabled
- Verify Node.js is installed and in your PATH

### Port already in use
- Change the PORT in your `.env` file
- Or stop any other application using port 3001

### MongoDB connection errors
- Ensure MongoDB is running
- Check your MONGO_URI in the `.env` file

## Important Notes

- The server starts when you **log in** to Windows
- If you want it to start even before login, you'll need to configure it differently
- The server will automatically shut down when you shut down Windows
- If you close the command window, the server will stop

