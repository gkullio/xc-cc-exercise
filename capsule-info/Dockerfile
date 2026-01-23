FROM nginx:alpine

# Copy static files
COPY index.html /usr/share/nginx/html/
COPY apps.html /usr/share/nginx/html/
COPY scouter.html /usr/share/nginx/html/
COPY scouter.js /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/

# Custom nginx config with WebSocket proxy to scouter backend
RUN echo 'server { \
    listen 8080; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /ws/scan { \
        proxy_pass http://scouter-app:4000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_read_timeout 86400; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
