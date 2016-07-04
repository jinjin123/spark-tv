var server = require('http').createServer();
var url = require('url');
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ server: server });
var express = require('express');
var app = express();
var port = 8888;

app.use(express.static(__dirname + '/node_modules/bootstrap/dist'));
app.use(express.static(__dirname + '/node_modules/jquery/dist'));

app.get('/', function(req, res, next){
    res.sendFile(__dirname + '/public/control.html');
});
app.get('/clients',function(req, res, next){
    res.sendFile(__dirname + '/public/clients.html');
});

var sockets = [];
var clients = {};
var servertime = function(){
    var startAt = 0;
    var lapTime = 0;

    var now = function(){
        return (new Date()).getTime();
    };

    this.start = function(){
        startAt = startAt ? startAt:now();
    };

    this.pause = function(){
        lapTime = startAt ? lapTime + now() - startAt :lapTime;
        startAt = 0;
    };

    this.stop = function(){
        lapTime = startAt = 0;
    };

    this.time = function(){
        return lapTime + (startAt ? now()- startAt :0);
    };

};
var x = new servertime();
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
        // var now = new Date();
        // console.log (now.toLocaleString() + ' ' +message);
        // wss.broadcast (message);

        data = JSON.parse(data);
        switch(data.type){
            case 'ready':
                var total = data.message;
                var num = data.num;
                clients[num] = id;
                if(clients.length == total){
                  wss.broadcast({uid:ws.uid,message:"blank",type:"start"});
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
