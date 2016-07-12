var PORT = 9080;

var http = require('http');
var url=require('url');
var fs=require('fs');
var mime=require('./mime.js').types;
var path=require('path');

var server = http.createServer(function (request, response) {
    var pathname = url.parse(request.url).pathname;

    console.log(pathname);
    //Implement reboot logic
    if ( pathname == "/reboot" ) {
       require('shelljs/global');
       touch('./index.js'); //Trigger supervisor node to restart nodejs
       response.writeHead(302, {
         'Location': 'index.html'
       });
       setTimeout(function(){
         response.end();
       }, 300);
    } else if ( pathname == "/rewind" ) {
       var serverip = "192.168.1.124:8888"
       ws = new WebSocket('ws://'+serverip);
       ws.send(JSON.stringify({message:"",type:"force_rewind"})); 
       ws.close();
       response.writeHead(302, {
         'Location': 'index.html'
       });
       setTimeout(function(){
         response.end();
       }, 300);
    } else {

    if (pathname.charAt(pathname.length - 1) == "/") {
            //如果访问目录
            pathname += "index.html"; //指定为默认网页
    }
    var realPath = path.join("/usr/src/app", pathname);
    var ext = path.extname(realPath);
    ext = ext ? ext.slice(1) : 'unknown';
    fs.exists(realPath, function (exists) {
        if (!exists) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });

            response.write("This request URL " + pathname + " was not found on this server.");
            response.end();
        } else {
            fs.readFile(realPath, "binary", function (err, file) {
                if (err) {
                    response.writeHead(500, {
                        'Content-Type': 'text/plain'
                    });
                    response.end(err);
                } else {
                    var contentType = mime[ext] || "text/plain";
                    response.writeHead(200, {
                        'Content-Type': contentType
                    });
                    response.write(file, "binary");
                    response.end();
                }
            });
        }
    });
  }//end reboot else
});
server.listen(PORT);
console.log("Server runing at port: " + PORT + ".");
