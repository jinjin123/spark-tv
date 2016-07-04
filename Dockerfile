FROM node:slim
ENV APP_PATH=/usr/src/app
ADD . $APP_PATH
#RUN mkdir -p /usr/src/app
#RUN npm install websocket
#COPY index.js /usr/src/app/
#COPY package.json /usr/src/app/package.json
#RUN cd /usr/src/app && npm install 
#&& node index.js
# Run installation of app
RUN cd $APP_PATH && npm install
# Run start app to STDOUT
CMD cd $APP_PATH && node index.js >> /dev/stdout
# replace this with your application's default port
EXPOSE 8888
