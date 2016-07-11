var server = require('http').createServer();
var url = require('url');
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ server: server });
var express = require('express');
var app = express();
var port = 8888;

var sockets = [];
var clients = {};
var n = 0;
var total;
wss.broadcast = function (data) {
    for (var i in this.clients) {
        this.clients [i].send (JSON.stringify(data));
    }
};

wss.on ('connection', function connection(ws) {
    var id = ws.upgradeReq.headers['sec-websocket-key'];
    ws.uid = ws.upgradeReq.headers['sec-websocket-key'];
    console.log("用戶" + id + "已連結。");

    ws.on ('message', function (data) {
        data = JSON.parse(data);
        console.log(data);
        switch(data.type){
            case 'ready':
                total = data.message;
                var num = data.num;
                clients[num] = id;
                console.log(clients);
                console.log("Socket.length = " + sockets.length);
                console.log("Total = " + total);
                if(sockets.length == total){
                  wss.broadcast({uid:ws.uid,message:"blank",type:"start"});
                  console.log("所有屏幕已連結，开始播放...");
                }
                break;
            case 'end':
                n ++;
                console.log("length");
                console.log("N = " + n);
                console.log("total="+total);
                console.log(sockets.length);
                if(n == total && sockets.length == total){
                  wss.broadcast({uid:ws.uid,message:"blank",type:"rewind"});
                  console.log("rewind");
                  n = 0;
                }else if(n == sockets.length && sockets.length != total){
                  wss.broadcast({uid:ws.uid,message:"blank",type:"next"});
                  n = 0;
                  console.log("next");
                }
              break;
            default:
              console.log(data.message);
              break;
        }
    });

    ws.on('close',function(){
        console.log("用戶"+ id + "已斷線。");
        var i;
        for (var item in sockets){
            if(sockets[item] == id){
                i = item;
            }
        }
        sockets.splice(i,1);
        console.log(sockets);
        console.log(clients);
    });
//    if (sockets.length < 8) {
      sockets.push(id);
      console.log(sockets);
//    }
});
server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port);});
