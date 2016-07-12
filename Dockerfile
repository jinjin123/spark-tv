FROM node:slim

#install npm supervisor
RUN /usr/local/bin/npm install supervisor -g

ENV APP_PATH=/usr/src/app
# Putting local code into working dir
ADD . $APP_PATH
# Run installation of app
CMD cd $APP_PATH && npm install 

#CMD node /usr/src/app/http_server.js
RUN node /usr/src/app/http_server.js >> /dev/stdout &
CMD /usr/local/bin/supervisor index.js >> /dev/stdout

# replace this with your application's default port
EXPOSE 8888
EXPOSE 9080
