FROM nginx:alpine

# Copy static files
COPY index.html /usr/share/nginx/html/
COPY apps.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/

# Custom nginx config for SPA-friendly routing
RUN echo 'server { \
    listen 8080; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
