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
var playing = "no";
var tv_num = 0;
wss.broadcast = function (data) {
    for (var i in this.clients) {
        this.clients [i].send (JSON.stringify(data));
    }
};

wss.on ('connection', function connection(ws) {
    var id = ws.upgradeReq.headers['sec-websocket-key'];
    ws.uid = ws.upgradeReq.headers['sec-websocket-key'];
    console.log("用戶" + id + "已連結。");
    playing = "no";
    ws.on ('message', function (data) {
        var remote_ipaddr = ws.upgradeReq.headers['x-forwarded-for'] || ws.upgradeReq.connection.remoteAddress;
        var ip_string = remote_ipaddr.toString();
        console.log("ip = " +  remote_ipaddr);
        data = JSON.parse(data);
        console.log("data");
        console.log(data);
        switch(data.type){
            case 'ready':
                if (playing == "yes") {
                  break;
                }
                total = data.message;
                var num = data.num;
                clients[num] = id;
                console.log(clients);
                console.log("Socket.length = " + sockets.length);
                console.log("Total = " + total);
                //While n always in 1-8, mapping n with array and get unique values of the array prevent TV duplicate request
                tv_map[tv_num++] = ip_string;
                console.log(tv_map);

                //Check unique
                //http://jszen.com/best-way-to-get-unique-values-of-an-array-in-javascript.7.html
	        var arr = {},r=[];
	        for(var i = 0; i < tv_map.length; i++) 
	        {
		  if (!arr[tv_map[i]]) 
		  {
			arr[tv_map[i]] = true; 
                        if ( tv_map[i] != "" || tv_map[i] != "undefined" ) {
	  		  r.push(tv_map[i]); 
                        }
		  }
	        }
                console.log(r);
                console.log(r.length);
                if(r.length == total && playing == "no" ){
                  wss.broadcast({uid:ws.uid,message:"blank",type:"start"});
                  tv_map = [];
                  tv_num = 0;
                  console.log("所有屏幕已連結，开始");
                  playing = "yes";
                }
                break;
            case 'end':
                //While n always in 1-8, mapping n with array and get unique values of the array prevent TV duplicate request
                tv_map[tv_num++] = ip_string;

                //Check unique
                //http://jszen.com/best-way-to-get-unique-values-of-an-array-in-javascript.7.html
	        var arr = {},r=[];
	        for(var i = 0; i < tv_map.length; i++) 
	        {
		  if (!arr[tv_map[i]]) 
		  {
			arr[tv_map[i]] = true;
                        if ( tv_map[i] != "" || tv_map[i] != "undefined" ) {
	  		  r.push(tv_map[i]); 
                        }
		  }
	        }
                console.log(r);
                console.log("r length = " + r.length);
                console.log("total="+total);
                if( r.length == total ) { //&& sockets.length == total){
                  setTimeout(function(){ 
                    wss.broadcast({uid:ws.uid,message:"blank",type:"rewind"});
                  }, 3000);
                  var d = new Date(); 
                  console.log("rewind" + d.toString());
                  n = 0;
                  tv_map = [];
                  tv_num = 0;
                } else if(n == sockets.length && sockets.length != total){ //Always not running
                  wss.broadcast({uid:ws.uid,message:"blank",type:"next"});
                  //n = 0;
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

