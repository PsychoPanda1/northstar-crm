FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY *.mjs *.js *.html *.css *.md ./

RUN mkdir -p /app/data && chown -R node:node /app
ENV PORT=4173
ENV NODE_ENV=production
ENV NORTHSTAR_DATA_FILE=/app/data/state.json
ENV NORTHSTAR_SESSION_FILE=/app/data/state.json.sessions

USER node
EXPOSE 4173
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4173) + '/api/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"
CMD ["node", "server.mjs"]
