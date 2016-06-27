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
function type(obj){
    return Object.prototype.toString.call(obj).slice(8, -1);
}
function isa(a, Type) {
    return type(a) === Type;
}
(function (fun){
    var eventMethod = window.removeEventListener ? "removeEventListener" : "detachEvent";
    window[eventMethod](eventMethod === "detachEvent" ? "onmessage" : "message", fun, false);
    eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    window[eventMethod](eventMethod === "attachEvent" ? "onmessage" : "message", fun, false);
})(function (evt){
    if(window.ext) {
        if(evt.data.type === 'request') {
            if(isa(window.ext[evt.data.method], 'Function')){
                window.ext[evt.data.method].apply(window.ext, evt.data.argument);
            }
        }
    }
});  
function hostinfo(url){
    url = url ? url : location.href;
    var m = url.match(/^([^:]+):\/\/([^:\/]+)(:([0-9]+))?(\/[^\/]*)*/)
    if(m){
        return {
            protocol:m[1],
            host:m[2],
            port:m[4],
            path:(m[5] === undefined ? '/' : m[5]),
            base:(m[1] + '://' + m[2] + (m[3] ? m[3] : '')) 
        };
    }
}


function Signage(){
    function Sync(url, onupdate, update_this){
        var timer, self = this;
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
        self.stopDownload = function (){
            if (timer) {
                window.clearTimeout(timer);
                timer = undefined;
            }       
            return self; 
        };
        self.forceUpdate = function(onerror, ethis){
            $.ajax({
                cache: false,
                url: url,
                dataType: "json",
                jsonp : false
            }).fail(function (e) {
                console.log("GET " + url + " Fail.");
                if (isa(onerror, 'Function')) {
                    onerror.call(ethis, e);
                }
            }).done(function (data) {
                console.log("GET " + url + " Success.");
                self.set(data, true);
            });
            return self; 
        };
        self.downloadOnce = function (onerror, ethis) {
            $.ajax({
                cache: false,
                url: url,
                dataType: "json",
                jsonp : false
            }).fail(function (e) {
                console.log("GET " + url + " Fail.");
                if (isa(onerror, 'Function')) {
                    onerror.call(ethis, e);
                }
            }).done(function (data) {
                console.log("GET " + url + " Success.");
                self.set(data);
            });
            return self;            
        };
        self.download = function (onerror, ethis) {
            const retry_interval = 20000;
            self.stopDownload();
            $.ajax({
                cache: false,
                url: url,
                dataType: "json",
                jsonp : false
            }).fail(function (e) {
                console.log("GET " + url + " Fail.");
                if (isa(onerror, 'Function')) {
                    onerror.call(ethis, e);
                }
            }).done(function (data) {
                console.log("GET " + url + " Success.");
                self.set(data);
            }).always(function (){
                timer = window.setTimeout(function(){
                    self.download(onerror, ethis);
                }, retry_interval);
            });
            return self;
        };
        self.get = function(){
            return load();
        };    
        self.set = function (data, force){
            try {
                if(!force) {
                    var old = load();
                    if (JSON.stringify(old) !== JSON.stringify(data)) {
                        save(data);
                        if (isa(onupdate, 'Function')) {
                            if(data === null) {
                                data = undefined;
                            }
                            onupdate.call(update_this, data, old);
                        }
                    }                    
                } else {
                    if (isa(onupdate, 'Function')) {
                        if(data === null) {
                            data = undefined;
                        }
                        onupdate.call(update_this, data, old);
                    }
                }
            } catch(e) {}        
        };
        (function () {
            var v = load();
            if (v === null){
                v = undefined;
            }
            if ((v !== undefined) && isa(onupdate, 'Function')) {
                onupdate.call(update_this, v);
            }
        })();   
    }


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
                    var ret = items.map(function (dish){
                        var tag = '<div style="'+'position:absolute;z-index:999;left:'+dish.x+'px;top:'+dish.y+'px;'+'">';
                        tag += '<img src="images/soldout.png" style="'+'width:'+dish.icon_width+'px;height:'+dish.icon_height+'px;'+'"></img>';
                        tag += '</div>';
                        return tag;
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
                window.repo.clean([].concat.apply([], newLst.map(function (item) {
                    return item.materials;
                })));
            } else if(top && top.repo) {
                top.repo.clean([].concat.apply([], newLst.map(function (item) {
                    return item.materials;
                })));                
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
        }
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
    function Player(sites){
        var self = this;
            sites = sites ? sites : {
                html5: $('#html5'),
                image: $('#image'),
                video: $('#video'),
                deft:  $('#deft')
            };
        function ready(filename, onready, notready){
            if(top && top.repo) {
                top.repo.exists(filename, function (e){
                    (e && e.exists) ? onready.call(self) : notready.call(self);
                }, notready);                                
            } else if(window.repo){
                window.repo.exists(filename, function (e){
                    (e && e.exists) ? onready.call(self) : notready.call(self);
                }, notready);                                                
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
        var timer, paused = true;
        function stopPlay(){
            window.clearTimeout(timer);
            timer = undefined;
            sites['video'].off('error').off('ended');         
            sites['video'].get(0).pause();           
            sites['image'].off('error');
        }
        function play(item, calc_onend){
            var site = sites[item.type];
            function myonend(pos, type){
                return function (x){
                    stopPlay();
                    sites[type].off('error');
                    console.log(pos);
                    if(!paused && isa(calc_onend, 'Function')) {                        
                        if(x !== undefined) {
                            console.log(x);    
                        }
                        calc_onend()();
                    }
                }
            }
            function setUrl(url, type, duration){
                switch (type){
                case 'html5':
                case 'image':
                    site.off('error').error(myonend('error of img ' + url, type));
                    site.attr('src', url);
                    //console.log('set img timeout ' + url);
                    timer = window.setTimeout(myonend('timeout of img ' + url, type), duration);                    
                    break;
                case 'video':
                    site.off('error').off('ended').get(0).load();
                    site.attr('src', url);
                    site.on('ended', myonend('ended of video ' + url, type))
                        .on('error', myonend('error of video ' + url, type)).get(0).play(); 
                    if(duration){
                        //console.log('set video timeout ' + url);
                        timer = window.setTimeout(myonend('timeout of video ' + url, type), duration);
                    }
                    break;
                default:
                    break;
                }                
            }
            return function (){
                stopPlay();
                if(item.overlay) {
                    $('#overlay').html(item.overlay);
                }else{
                    $('#overlay').html('');
                }                                
                ready(item.filename, function(){
                    //console.log('ready set ' + item.filename);
                    setUrl('http://127.0.0.1:9080/' + item.filename, item.type, item.duration);
                    show_only(item.type);
                }, function(){
                    //console.log('ready set ' + item.filename);
                    setUrl(item.download, item.type, item.duration);
                    show_only(item.type);
                });
            }
        }
        self.showmsg = function(p) {
            show_only('deft').html('<h1 style="text-align:center; vertical-align:-500;">' + p + '</h1>')
        }
        self.stop = function (){
            stopPlay();   
            paused = true;             
        }
        self.start = function(lst){
            stopPlay();
            paused = false;
            function playAt(i){
                return play(lst[i], function(){
                    ++i;
                    if(i>=lst.length){
                        i = 0;
                    }
                    return playAt(i);
                });
            }
            if(isa(lst, 'Array') && (lst.length>0)){
                playAt(0)();
            } else {
                self.showmsg("Nothing to play for now!");
            }
        };
    }
    var self = this;
    var player = new Player();
    var playlist = new PlayList(function (lst){
        player.start(lst);
    });
    self.showmsg = function(p){
        player.showmsg(p);
    };
    self.forceUpdate = function(onerror, ethis){
        playlist.forceUpdate(onerror, ethis);
    };
    self.start = function(url){
        self.stop();
        playlist.start(url, function(e){
            console.log(e);
            if(e.message){
                player.showmsg(e.message);
            }
        });
    };
    self.stop = function(){
        playlist.stop();        
        player.stop();
    };
}



function Config(url){
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
