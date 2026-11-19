#!/bin/bash
cd ~/dental-booking

# 1. Start Python Backend (Port 8000)
osascript -e 'tell app "Terminal" to do script "cd ~/dental-booking/ai-agent && source .venv/bin/activate && uvicorn main:app --reload --port 8000"'

# 2. Start Client App (Port 5173)
osascript -e 'tell app "Terminal" to do script "cd ~/dental-booking/frontend && npm run dev"'

# 3. Start Admin Command Center (Port 5174)
osascript -e 'tell app "Terminal" to do script "cd ~/dental-booking/admin-dashboard && npm run dev -- --port 5174"'

# Wait 3 seconds and open both apps in your browser
sleep 3
open "http://localhost:5173"
open "http://localhost:5174"
