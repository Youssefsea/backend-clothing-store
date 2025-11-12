#!/bin/sh

ngrok http node_app:3000 &

# انتظر ngrok يبدأ
sleep 3

# اطبع رابط ngrok بوضوح
curl --silent http://localhost:4040/api/tunnels | grep -o 'https://[^"]*' | head -n 1

# ابقِ الحاوية شغالة
wait
