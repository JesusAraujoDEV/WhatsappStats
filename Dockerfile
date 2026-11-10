FROM nginx:1.27-alpine
COPY *.html *.js /usr/share/nginx/html/
COPY names.sh /docker-entrypoint.d/40-names.sh
RUN chmod +x /docker-entrypoint.d/40-names.sh
