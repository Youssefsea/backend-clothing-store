#!/bin/sh

ngrok http node_app:3000 &

sleep 3

curl --silent http://localhost:4040/api/tunnels | grep -o 'https://[^"]*' | head -n 1

wait
