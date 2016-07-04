FROM node:slim
ENV APP_PATH=/usr/src/app
# Putting local code into working dir
ADD . $APP_PATH
# Run installation of app
CMD cd $APP_PATH && npm install 
# Run start app to STDOUT
CMD node index.js >> /dev/stdout
# replace this with your application's default port
EXPOSE 8888
