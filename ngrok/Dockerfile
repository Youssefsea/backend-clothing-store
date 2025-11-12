FROM alpine:latest

RUN apk add --no-cache curl
RUN wget -O /usr/local/bin/ngrok https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
    && tar -xzf /usr/local/bin/ngrok -C /usr/local/bin/ \
    && chmod +x /usr/local/bin/ngrok

COPY ngrok-start.sh /ngrok-start.sh
RUN chmod +x /ngrok-start.sh

ENTRYPOINT ["/bin/sh", "/ngrok-start.sh"]
