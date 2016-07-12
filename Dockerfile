FROM node:slim
#Prepare environment
CMD apt-get update
CMD apt-get -y install supervisor
CMD pip install supervisor-stdout
COPY ./etc/supervisord.conf /etc/supervisord.conf

#install npm supervisor
CMD npm install supervisor -g

ENV APP_PATH=/usr/src/app
# Putting local code into working dir
ADD . $APP_PATH
# Run installation of app
CMD cd $APP_PATH && npm install 

# replace this with your application's default port
EXPOSE 8888
EXPOSE 9080

# Run application
CMD ["/usr/bin/supervisord", "-n"]
