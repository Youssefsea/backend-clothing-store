#!/bin/sh
# Start ngrok in the background
grok http node_app:3000 --log=stdout &

# انتظر ngrok يبدأ
sleep 3

# اطبع رابط ngrok بوضوح
curl --silent http://localhost:4040/api/tunnels | \
  grep -o 'https://[a-zA-Z0-9.-]*.ngrok-free.app' | head -1 | \
  xargs -I {} echo "\n================ NGROK URL ================\n\n  {}  (انسخ هذا الرابط)\n\n===========================================\n"

# ابقِ الحاوية شغالة
wait
