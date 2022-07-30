FROM node:16-alpine
WORKDIR /opt/jmoore.dev.2
COPY ./ ./
RUN npm i --save-dev && npm run build
RUN chown -R node:node ./
USER node
CMD npm start