var server = require('http').createServer();
var url = require('url');
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ server: server });
var express = require('express');
var app = express();
var port = 8888;

app.use(express.static(__dirname + '/node_modules/bootstrap/dist'));
app.use(express.static(__dirname + '/node_modules/jquery/dist'));

//app.get('/', function(req, res, next){
//    res.sendFile(__dirname + '/public/control.html');
//});
//app.get('/clients',function(req, res, next){
//    res.sendFile(__dirname + '/public/clients.html');
//});

var sockets = [];
var clients = {};
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
        n = 0;
        switch(data.type){
            case 'ready':
                var total = data.message;
                var num = data.num;
                clients[num] = id;
                if(sockets.length == total){
                  wss.broadcast({uid:ws.uid,message:"blank",type:"start"});
                }
                break;
            case 'end':
                n ++;
                if(n == total && sockets.length == total){
                  wss.broadcast({uid:ws.uid,message:"blank",type:"rewind"});
                  n = 0;
                }else if(sockets.length != total){
                  wss.broadcast({uid:ws.uid,message:"blank",type:"next"});
                  n = 0;
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
    });
    sockets.push(id);
    console.log(sockets);
    console.log(clients);
});
server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port);});
