FROM node:slim
ENV APP_PATH=/usr/src/app
# Putting local code into working dir
ADD . $APP_PATH
# Run installation of app
CMD cd $APP_PATH && npm install 
# Run start app to STDOUT
CMD node index.js >> /dev/stdout
# Set permission allow node reboot
CMD setcap CAP_SYS_BOOT=+ep /usr/local/bin/node
# replace this with your application's default port
EXPOSE 8888
