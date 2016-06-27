/*jslint devel: true */
/*global saveStorage: true, $: true, loadStorage: true, log: true, AndroidVideo: true, parseRawLists: true */
/*
//var all_timers=[];

function xsetTimeout(fun, interval){
    var t = window.setTimeout(function (){
        fun();
        var i = all_timers.indexOf(t);
        if((i>=0) && (i<all_timers.length)) {
            all_timers.splice(i, 1);
        }
//        console.log('Timeout ' + t);
//        console.log(all_timers);
    }, interval);
    all_timers.push(t);
//    console.log('xsetTimeout ' + t);
//    console.log(all_timers);
    return t;
}
function xclearTimeout(t){
    var i = all_timers.indexOf(t);
    if((i>=0) && (i<all_timers.length)) {
        window.clearTimeout(t);
        all_timers.splice(i, 1);
//        console.log('xclearTimeout ' + t);
//        console.log(all_timers);          
    } else {
//        window.clearTimeout(t);
//        console.log('Untracked timer ' + t);
    }
  
}
*/
function synchronizer(signage, url, openmsg){
    function clean(){
        if(window.sync_socket){
            if ((window.sync_socket.readyState !== window.sync_socket.CLOSED) && (window.sync_socket.readyState !== window.sync_socket.CLOSING)) {
                window.sync_socket.close();
                window.sync_socket = undefined;
                delete window.sync_socket;
            }
        }        
    }
    clean();
    window.sync_socket = new WebSocket(url);
    window.sync_socket.onmessage = function(evt){
        var data = JSON.parse(evt.data);
        signage.playVideo(data.seek);
        console.log(data);
    };
    window.sync_socket.onopen = function(){
        window.sync_socket.send(openmsg);
    };
    window.sync_socket.onerror = function(evt){
        clean();
    };
    window.sync_socket.onclose = function(evt){
       var tbl = {
            1000:"Normal closure, meaning that the purpose for which the connection was established has been fulfilled.",
            1001:"An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.",
            1002:"An endpoint is terminating the connection due to a protocol error",
            1003:"An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).",
            1004:"Reserved. The specific meaning might be defined in the future.",
            1005:"No status code was actually present.",
            1006:"The connection was closed abnormally, e.g., without sending or receiving a Close control frame",
            1007:"An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).",
            1008:"An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.",
            1009:"An endpoint is terminating the connection because it has received a message that is too big for it to process.",
            1010:"An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension(" + evt.reason + "), but the server didn't return them in the response message of the WebSocket handshake.",
            1011:"A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.",
            1012:"The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).",
        };
        console.log(tbl[evt.code] === undefined ? "Unknown reason" : tbl[evt.code]);
    };
}
function SparkPOS(){

    /*
    [{
        configuration: {
            start_date: "2015-11-02",
            tag: "current",
            end_date: "2015-11-02",
            start_time: "00:00",
            end_time: "23:59"
        },
        materials: [{
            content_id: "3782",
            playtime: "5",
            type: "image",
            filename: "0229e340b6c7870201085227d6680b21_屏幕快照 2015-10-28 16.09.22.png",
            download: "http://192.168.0.109/zkf/sites/default/files/material_image/0229e340b6c7870201085227d6680b21_%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202015-10-28%2016.09.22.png",
            dishes: [ ]
        },
        {
            content_id: "3759",
            playtime: "5",
            type: "image",
            filename: "a068c8193868628c39630bcd7254e452_184807g4qum47xjmj4je7g_4.gif",
            download: "http://192.168.0.109/zkf/sites/default/files/material_image/a068c8193868628c39630bcd7254e452_184807g4qum47xjmj4je7g_4.gif",
            dishes: [ ]
        }]
    }]
    */

    function PlayList(onchange) {
        var self = this;
        var sync;
        function process(newLst, now){
            function getDate(strd,str) {
                var ret = new Date(),
                    arrd = strd.match(/(\d{1,4})-(\d{1,2})-(\d{1,2})/i),
                    arr = str.match(/(\d{1,2}):(\d{1,2})/i);
                if (arrd && (arrd[0] === strd) && (arrd.length === 4)) {
                    ret.setFullYear(parseInt(arrd[1], 10));
                    ret.setMonth(parseInt(arrd[2], 10) -1);
                    ret.setDate(parseInt(arrd[3], 10));
                }
                if (arr && (arr[0] === str) && (arr.length === 3)) {
                    ret.setHours( parseInt(arr[1], 10));
                    ret.setMinutes(parseInt(arr[2], 10));
                    ret.setSeconds(0);
                    ret.setMilliseconds(0);
                }
                return ret;
            }
            function getOverlay(items) {
                if(isa(items, 'Array')) {
                    items = items.filter(function(x){
                        return x;
                    });
                    var ret = items.map(function (dish){
                        if(dish){
                            var tag = '';
                            if(dish.x && dish.y && dish.icon_width && dish.icon_height) {
                                tag += '<div style="'+'position:absolute;z-index:999;left:'+dish.x+'px;top:'+dish.y+'px;'+'">';
                                tag += '<img src="assets/soldout.png" style="'+'width:'+dish.icon_width+'px;height:'+dish.icon_height+'px;'+'"></img>';
                                tag += '</div>';                                
                            }
                            if(dish.price) {
                                tag += dish.price;
                            }
                            return tag;                            
                        }
                    });
                    return ''.concat.apply('', ret);
                }
                return '';
            }
            newLst = isa(newLst, 'Array') ? newLst : [];
            newLst = newLst.filter(function(item){
                var end = getDate(item.configuration.end_date, item.configuration.end_time);
                return +now < +end;
            });
            if(window.repo){
                var new_materials = [].concat.apply([], newLst.map(function (item) {
                    return item.materials;
                }));
                new_materials = (function (arr){
                    var dict = {};
                    var i;
                    for(i=0;i<arr.length;++i){
                        dict[JSON.stringify(arr[i])] = true;
                    }
                    var ret = Object.keys(dict);
                    return ret.map(function(x){
                        return JSON.parse(x);
                    });
                })(new_materials);
                window.repo.clean(new_materials);
                new_materials.forEach(function(itm){
                    window.repo.download(itm.download, itm.filename);
                });
            }
            var effective = newLst.filter(function(item) {
                var start = getDate(item.configuration.start_date, item.configuration.start_time);
                return +now >= +start;
            });
            var m = [].concat.apply([], effective.map(function(item){
                return item.materials;
            }));
            return m.map(function (item){
                item.overlay = getOverlay(item.dishes);
                if(item.playtime){
                    item.duration = item.playtime * 1000;
                }
                return item;
            });
        }
        self.list = function(now){
            return process(sync.get(), now ? now : new Date());
        }
        self.forceUpdate = function(onerror, ethis){
            if(sync){
                sync.forceUpdate(onerror, ethis);
            }
        };
        self.start = function (url, onerror, ethis){
            self.stop();
            if (isa(url, 'String')) {
                sync = new Sync(url, function (newLst, oldLst){
                    if(isa(onchange, 'Function')){
                        if(isa(newLst, 'Array')){
                            //console.log(JSON.stringify(newLst));
                            var current = process(newLst, new Date());
                            onchange.call(self, current);                            
                        } else if(isa(onerror, 'Function')) {
                            onerror.call(ethis, newLst);
                        }
                    }
                });            
                sync.downloadOnce(onerror, ethis);                
            } else if(isa(url, 'Array')) {
                if(isa(onchange, 'Function')){
                    var current = process(url, new Date());
                    onchange.call(self, current);
                }                
            }
        };
        self.pause = function(){
            if(sync){
                sync.stopDownload();
            }
        };
        self.resume = function(onerror, ethis){
            if(sync){
                sync.download(onerror, ethis);
            }
        };
        self.pulling = function(onerror, ethis){
            if(sync){
                sync.download(onerror, ethis);
            }
        };
        self.stop = function (){
            if(sync) {
                sync.stopDownload();
            }
        }
    }
    /*
    [{
        content_id: "3782",
        playtime: "5",
        type: "image",
        filename: "0229e340b6c7870201085227d6680b21_屏幕快照 2015-10-28 16.09.22.png",
        download: "http://192.168.0.109/zkf/sites/default/files/material_image/0229e340b6c7870201085227d6680b21_%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202015-10-28%2016.09.22.png",
        dishes: [ ],
        overlay: "<div>...</div>",
        duration:5000
    }]
    */
    function RawPlayer(){
        var self = this,
            freeze = false;
            sites = {
                html5: $('#html5'),
                image: $('#image'),
                video: $('#video'),
                deft:  $('#deft')
            };

        function ready(filename, onready, notready){
            if(window.repo){
                window.repo.exists(filename, function (e){
                    (e && e.exists) ? onready.call(self) : notready.call(self);    
                }, function(n){
                    notready.call(self);    
                });                                                
            }
        }        
        function show_only(type){
            for(var i in sites){
                if(sites.hasOwnProperty(i)){
                    if(type !== i) {
                        sites[i].hide();
                    } else {
                        sites[i].show();
                    }
                }
            }
            return sites[type];
        }
        function build_next(pos, next){
            return function(x){
                console.log(pos);
                if(isa(next, 'Function')){
                    next.call(self, x);
                }
            }
        }
        self.pause = function(){
            if(!freeze){
                sites['video'].get(0).pause();    
            }
        };
        self.stop = function(){
            if(!freeze){
                $('#overlay').html('');
                sites['image'].off('error');
                sites['video'].off('error').off('canplay').off('ended');
                sites['video'].get(0).pause();                
            }
        };
        self.loadVideo = function(url, next, nthis){
            var site = sites['video'];
            self.stop();
            function vhandler(evt, f){
                return function(){
                    freeze = f;
                    if(isa(next,'Function')){
                        var arg = Array.prototype.slice.call(arguments);
                        arg.unshift(evt);
                        site.off(evt);
                        next.apply(nthis, arg);
                    }                    
                }
            }
            site.off('error').off('canplay').off('ended').attr('src', url);
            site.on('ended', vhandler('ended', false)).on('error', vhandler('error', false)).get(0).load();
            site.on('canplay', vhandler('canplay', true));
        };
        self.playVideo = function(time){
            var site = sites['video'];
            site.get(0).currentTime = time;
            if(time === 0){
                show_only('video');
                site.get(0).play();    
            }
        };
        self.show = function(type, url, overlay, next){
            if(!freeze){
                var site = sites[type];
                self.stop();
                switch (type){
                case 'html5':
                case 'image':
                    site.off('error').error(build_next('img error', next));
                    site.attr('src', url);
                    show_only(type);
                    $('#overlay').html(overlay);
                    break;
                case 'video':
                    site.off('error').off('canplay').off('ended').attr('src', url);
                    site.on('ended', build_next('vid ended', next)).on('error', build_next('vid error', next)).get(0).load();
                    site.on('canplay', function(){
                        show_only(type);
                        $('#overlay').html(overlay);
                    }).get(0).play();
                    break;
                case 'deft':
                    show_only('deft').html('<h1 style="text-align:center; vertical-align:-500;">' + url + '</h1>');
                    $('#overlay').html(overlay);
                    break;
                default:
                    break;
                }                
            }
        };
        self.msg = function(p){
            self.show('deft', p);
        };
        self.play = function(item, next){
            if(item.filename) {
                ready(item.filename, function(){
                    //console.log('ready set ' + item.filename);
                    self.show(item.type, 'http://127.0.0.1:9080/' + item.filename, item.overlay ? item.overlay : '', next);
                    
                }, function(){
                    //console.log('ready set ' + item.filename);
                    self.show(item.type, item.download, item.overlay ? item.overlay : '', next);
                    
                });                
            } else if (item.download) {
                self.show(item.type, item.download, item.overlay ? item.overlay : '', next);
            }
        };
    }
    function ListPlayer(raw){
        var self = this, list, current = 0, timer;
        function valid(lst){
            return isa(lst, 'Array') && (lst.length>0);
        }
        self.pause = function(){
            window.clearTimeout(timer);
            raw.pause();            
        };
        self.stop = function (){
            window.clearTimeout(timer);
            raw.stop();            
            current = 0;
        };
        function playAt(){
            window.clearTimeout(timer);
            if(valid(list)) {
                var item = list[current];
                function next(){
                    current++;
                    if(current >= list.length){
                        current = 0;
                    }                
                    playAt();                    
                }
                raw.play(item, next);
                if(item.duration){
                    timer = window.setTimeout(next, item.duration);
                }
            } else {
                raw.msg("Nothing to play for now!");
            }
        }
        self.start = function(lst){
            window.clearTimeout(timer);
            list = lst ? lst : list;
            current = 0;
            playAt();
        };
    }    
    function TimedPlayer(raw, do_play){
        var self = this, timer, list;
        function valid(lst){
            return isa(lst, 'Array') && (lst.length>0);
        }
        self.stop = function(){
            window.clearTimeout(timer);
            raw.stop();
        };
        self.pause = function(){
            window.clearTimeout(timer);
            raw.pause();
        };
        function lstFromURL(url){
            function nearestMinute(){
                var now = new Date();
                now.setMilliseconds(0);
                now.setSeconds(0);                
                now.setTime(now.getTime()+60000);
                return now;
            }
            return [{
                type:'video',
                download:url,
                start:nearestMinute()
            }];
        }
        self.start = function(lst){
            if(isa(lst, 'String')){
                lst = lstFromURL(lst);
            }
            if(valid(lst)){
                var now = new Date();
                lst = lst.filter(function(x){
                    return +x.start > +now;
                }).sort(function(a,b){
                    if(+a.start > +b.start){
                        return 1;
                    } else if(+a.start < +b.start){
                        return -1;
                    } else {
                        return 0;
                    }
                });
                if(lst.length > 0) {
                    var current = lst[0];    
                    window.setTimeout(function(){
                        do_play(current);
                    }, current.start - now);
                }
            }            
        };
    }
  
    var self = this;
    var rawPlayer = new RawPlayer();
    var player = new ListPlayer(rawPlayer);
    var timedPlayer = new TimedPlayer(rawPlayer, function(item){
        playlist.pause();        
        player.stop();
        rawPlayer.play(item, function(){
            playlist.resume();        
        });
    })
    var playlist = new PlayList(function (lst){
        player.start(lst);
    });
    self.forceUpdate = function(onerror, ethis){
        playlist.forceUpdate(onerror, ethis);
    };
    self.ontime = function(lst){
        timedPlayer.start(lst);
    };
    self.display = function (type, url){
        playlist.pause();        
        player.stop();
        rawPlayer.play({type:type, download:url}, function(){
            playlist.resume();        
        });        
    };
    function sync_server(url){
        var wshell = new Wshell();
        wshell.setHandler('command', function(from,  data, reply_func){
            window.command(data, reply_func);
        });        
        wshell.connect(Math.uuid(16), null, url);
        return wshell;
    }
    self.loadVideo = function(url, reply){
        playlist.pause();        
        player.stop();
        rawPlayer.loadVideo(url, function(evt){
            switch(evt){
            case 'canplay':
                reply({result:'success', error:null});
                break;
            case 'ended':
            case 'error':
            default:
                playlist.resume();
                break;
            }
        });
    };
    self.playVideo = function(seek){
        rawPlayer.playVideo(seek);
    };
    self.start = function(url){
        self.stop();
        playlist.start(url, function(e){
            console.log(e);
            if(e.message){
                rawPlayer.msg(e.message);
            }
        });
    };
    self.pulling = function(onerror, ethis){
        playlist.pulling(onerror, ethis);
    }
    self.stop = function(){
        playlist.stop();        
        player.stop();
    };
}



var test_list0 = [
    {
        "configuration":{
            "start_date":"2015-11-27",
            "tag":"current",
            "end_date":"2016-11-27",
            "start_time":"00:00",
            "end_time":"23:59"
        },
        "materials":[
            {
                "content_id":"3085",
                "playtime":"5",
                "type":"image",
                "filename":"11.jpg",
                "download":"http://zkf-tsoc.sparkpos.cn:9080/materials/burgerking/11.jpg",
                "dishes":[]
            }
            ,{
                "content_id":"3086",
                "playtime":"5",
                "type":"image",
                "filename":"12.png",
                "download":"http://zkf-tsoc.sparkpos.cn:9080/materials/burgerking/12.png",
                "dishes":[]
            }
            ,{
                "content_id":"3087",
                "playtime":"5",
                "type":"image",
                "filename":"13.jpg",
                "download":"http://zkf-tsoc.sparkpos.cn:9080/materials/burgerking/13.jpg",
                "dishes":[]
            }
            ,{
                "content_id":"3088",
                "playtime":"5",
                "type":"image",
                "filename":"14.png",
                "download":"http://zkf-tsoc.sparkpos.cn:9080/materials/burgerking/14.png",
                "dishes":[]
            }
            ,{
                "content_id":"3085",
                "playtime":"5",
                "type":"video",
                "filename":"1.mp4",
                "download":"http://zkf-tsoc.sparkpos.cn:9080/materials/burgerking/1.mp4",
                "dishes":[]
            }
          
        ]
    }
];
function command(data, reply){
    try{
        data.params=eval(data.params);
        function roundTime(s, f){
            var now = new Date();
            if(window.Configuration){
                (new Configuration()).setCurrentTime(function(d){
                    if(isa(s, 'Functoin')){ 
                        s(d);
                    }
                }, function(e){
                    if(isa(f, 'Function')){
                        f(e);
                    }
                }, {
                    year:now.getFullYear(),
                    month:now.getMonth() + 1,
                    day:now.getDate(),
                    hour:now.getHours(),
                    minute:now.getMinutes(),
                    sec:0
                });
            }            
        }
        function getArg(index){
            if(isa(data.params, 'Array')){
                if((data.params.length > index)&&(index>=0)){
                    return data.params[index];
                }
            }
        }
        switch(data.method){
        case 'echo':
            reply({result:data.params, error:null});
            break;
        case 'loadVideo':
            window.signage.loadVideo(getArg(0), function(result){
                if(result.result==='success'){
                    synchronizer(window.signage, getArg(1), JSON.stringify({command:"register", peer:getArg(0)}))
                }
                reply(result);
            });
            break;
        case 'ontime':
            roundTime();
            window.signage.ontime(getArg(0));
            reply({result:[data.params, new Date()], error:null});
            break;
        case 'test0':
            window.signage.start(test_list0);
            reply({result:'success', error:null});
            break;
        case 'update':
            window.signage.forceUpdate();
            reply({result:'success', error:null});
            break;
        case 'display':
            window.signage.display(getArg(0), getArg(1));
            reply({result:'success', error:null});
            break;                
        case 'clean':
            window.repo.clean(getArg(0));
            reply({result:'success', error:null});
            break;
        case 'rm':
            window.repo.mv(getArg(0), function(d){
                reply({result:d, error:null});
            }, function(e){
                reply({result:null, error:e});
            });
            break;                
        case 'mv':
            window.repo.mv(getArg(0), getArg(1), function(d){
                reply({result:d, error:null});
            }, function(e){
                reply({result:null, error:e});
            });
            break;
        case 'ls':
            window.repo.ls(function(e){
                reply({result:e, error:null});
            }, function(e){
                reply({result:null, error:e});
            }); 
            break;                       
        case 'exists':
            window.repo.exists(getArg(0), function(e){
                reply({result:e, error:null});
            }, function(e){
                reply({result:null, error:e});
            });
            break;
        case 'download':
            window.repo.download(getArg(0), getArg(1), function(){
                reply({result:'success', error:null});
            }, function(e){
                reply({result:null, error:e});
            });
            break;
        case 'screenshot':
            if(window.Signage) {
                (new Signage()).captureScreen(function(d){
                    reply({result:d, error:null});
                }, function(e){
                    reply({result:null, error:e});
                });
            } else {
                reply({result:null, error:'not implemented'});
            }
            break;
        case 'tile': 
            if(window.Signage) {
                (new Signage()).setTileInfo(function(){
                    reply({result:'success', error:null});
                }, function(e){
                    reply({result:null, error:e});
                }, getArg(0));              
            } else {
                reply({result:null, error:'not implemented'});
            }
            break;
        default:
            reply({result:null, error:'not implemented'});
            break;
        }
    }catch(e){
        reply({result:null, error:e.message});
    }
}
function onkeydown(evt){
    switch(evt.keyCode){
        case 38://up
            window.clearInterval(window.clock); 
            var current_nick_name = $('#pid').val();
            if(window.wshell.nick_name !== current_nick_name){
                if(isa(window.wshell.nick_name, 'String')){
                    window.wshell.leave(window.wshell.nick_name, function(from, data){
                        console.log('leave');
                        console.log(data);
                    });
                    delete window.wshell.nick_name;
                }
                if(current_nick_name) {
                    window.wshell.join(current_nick_name,function(from, data){
                        if(data.result === 'success'){
                            window.wshell.nick_name = current_nick_name;
                        }
                        console.log('join');
                        console.log(data);
                    });                            
                }                          
            }               
            $("#devinfo").hide();
            window.signage.start(config.playlistURL());
            break;
        case 40://down
            $("#devinfo").show();
            $("#pid").focus();
            $('#wshell_status').text(window.wshell.ready());
            window.signage.stop();
            window.clock = window.setInterval(function(){
                $('#time').text(new Date()); 
            }, 1000);
            break;
        case 48:
            console.log('0');
            $('body').css('-webkit-transform', 'rotateZ(0deg)');
            break;
        case 49:
            console.log('1');
            $('body').css('-webkit-transform', 'rotateZ(90deg)');
            break;                    
        case 406:
            console.log('blue');
            window.location.reload();
            break;
        case 405:
            console.log('yellow');
            window.location.reload();
            break;
        default:
            console.log('unknown key pressed ' + evt.keyCode);
            break;
    }
} 
function Setup(url){
    var self = this;
    function save(v) {
        try{
            if ((v === undefined) || (v === null)) {
                localStorage.removeItem(url);
            } else {
                localStorage.setItem(url, JSON.stringify(v));    
            }
        } catch(e){}
    }
    function load() {
        try {
            return JSON.parse(localStorage.getItem(url));
        } catch (e) {}
    }
    var cfg = load();
    if(!cfg) {
        cfg = {
            kernel_version: "N/A",
            did: "",
            version: "LG Signage",
            orientation: "4",
            pid: "4",
            size: "55",
            plc_id: "CN101",
            baseUrl: ""
        };
        save(cfg);
    }
    self.playlistURL = function(){
        return cfg.baseUrl + '/app/resources_play_list?did=' + cfg.did;
    };
    self.installDeviceURL = function(){
        return cfg.baseUrl + '/app/install_device';
    };
    self.heartbeatURL = function(){
        return cfg.baseUrl + '/app/heartbeat?did=' + cfg.did + '&time=' + new Data();
    };
    self.check = function(bad, ok_func) {
        'use strict';
        var msg = '',
            key,
            args = cfg;
        for (key in args) {
            if (args[key] === undefined) {
                msg = msg + '"' + key + '"' + '不能为空 ';
            }
        }
        if (msg.length > 0) {
            bad(msg);
        } else {
            $.ajax({
                cache: false,
                url: self.installDeviceURL(),
                dataType: "json",
                data: args,
                success: function (data, status) {
                    if (data.code === "102") {
                        bad("门店不存在");
                    } else if (data.code === "402") {
                        bad("PID重复");
                    } else if (data.state === "error") {
                        bad("Error code:" + data.code + " " + data.message);
                    } else {
                        ok_func();
                    }
                }
            }).fail(function (e) {
                console.log('InstallDevice Failed.');
                console.log(e);
                ok_func();
            });
        }
    };
    self.setBaseURL = function (baseUrl){
        cfg.baseUrl = baseUrl;
        save(cfg);
    };
    self.setDID = function (did){
        if(did) {
            cfg.did = did;
            save(cfg);
        } else {
            console.log("empty did");
        }
    }
    self.setPID = function (pid){
        cfg.pid = pid;
        save(cfg);
    }
    self.setPLCID = function (plcid){
        cfg.plc_id = plcid;
        save(cfg);
    }
    self.get = function (){
        cfg = load();
        return cfg;
    };    
}
