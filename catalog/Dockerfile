FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY html /usr/share/nginx/html

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]
