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
var tv_map = [];
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
                var remote_ipaddr = ws.upgradeReq.headers['x-forwarded-for'] || ws.upgradeReq.connection.remoteAddress;
                var ip_string = remote_ipaddr.toString();
                //num = ip_string.substr(ip_string.length - 1);
                console.log("ip = " +  remote_ipaddr);
                
                //While n always in 1-8, mapping n with array and get unique values of the array prevent TV duplicate request
                tv_map[n++] = ip_string;

                //Check unique
                // http://jszen.com/best-way-to-get-unique-values-of-an-array-in-javascript.7.html
                var r=[];
	        for(var i = 0; i < tv_map.length; i++) 
	        {
		    if (!tv_map[this[i]]) 
		    {
			tv_map[this[i]] = true; 
			r.push(this[i]); 
		    } 
	        }
                console.log(tv_map);
                console.log("N = " + n);
                console.log("total="+total);
                console.log(sockets.length);
                if( r.length == total && sockets.length == total){
                  setTimeout(function(){ 
                    wss.broadcast({uid:ws.uid,message:"blank",type:"rewind"});
                  }, 3000);
                  var d = new Date(); 
                  console.log("rewind" + d.toString());
                  n = 0;
                  tv_map = [];
                }else if(n == sockets.length && sockets.length != total){
                  wss.broadcast({uid:ws.uid,message:"blank",type:"next"});
                  n = 0;
                  console.log("next");
                }
              break;
            case 'force_rewind':
                  setTimeout(function(){ 
                  wss.broadcast({uid:ws.uid,message:"blank",type:"rewind"});
                  }, 3000);
                  var d = new Date(); 
                  console.log("rewind" + d.toString());
                  n=0;
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

