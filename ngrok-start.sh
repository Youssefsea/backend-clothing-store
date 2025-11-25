#!/bin/sh
ngrok http node_app:3000 --log=stdout &

sleep 3

curl --silent http://localhost:4040/api/tunnels | \
  grep -o 'https://[a-zA-Z0-9.-]*.ngrok-free.app' | head -1 | \
  xargs -I {} echo "\n================ NGROK URL ================\n\n  {}  (انسخ هذا الرابط)\n\n===========================================\n"

wait
