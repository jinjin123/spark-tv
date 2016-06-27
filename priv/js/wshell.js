"use strict";
/*
packet looks like
{
    from: 
    reply_to: (optional)
    to:
    type : request | reply  
    id:
    data:{
        ...
    }
}

*/
//*
function hookmsg(fun){
    var eventMethod = window.removeEventListener ? "removeEventListener" : "detachEvent";
    window[eventMethod](eventMethod === "detachEvent" ? "onmessage" : "message", fun, false);
    eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    window[eventMethod](eventMethod === "attachEvent" ? "onmessage" : "message", fun, false);
}

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
function type(obj){
    return Object.prototype.toString.call(obj).slice(8, -1);
}
function isa(a, Type) {
    return type(a) === Type;
}
function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}
function jsonable(e) {
    try {
        var str = JSON.stringify(e);
        return {
            data:e,
            string:str
        };
    } catch (err) {
        if (isa(e, 'String')) {
            return e;
        }
        if (isa(e.message, 'String')) {
            return e.message;
        }
        return 'Unknown exception';
    }
}


function Wsocket(on_open, on_close, on_message, on_send, on_idle) {
    function link(f) {
        f = isa(f, 'Function') ? f : function () {};
        function callback() {
            return f.apply(this, arguments);
        }
        callback.source = function (newf) {
            assert(isa(newf, 'Function'), '"newf" must be a function');
            var oldf = f;
            f = function () {
                var x = newf.apply(this, arguments);
                if (isa(x, 'Array')) {
                    return oldf.apply(this, x);
                } else {
                    return oldf.call(this, x);
                }
            };
            return callback;
        };
        callback.sink = function (newf) {
            assert(isa(newf, 'Function'), '"newf" must be a function');
            var oldf = f;
            f = function () {
                var x = oldf.apply(this, arguments);
                if (isa(x, 'Array')) {
                    return newf.apply(this, x);
                } else {
                    return newf.call(this, x);
                }
            };
            return callback;
        };
        callback.before = function (newf) {
            assert(isa(newf, 'Function'), '"newf" must be a function');
            var oldf = f;
            f = function () {
                newf.apply(this, arguments);
                return oldf.apply(this, arguments);
            };
            return callback;
        };
        callback.after = function (newf) {
            assert(isa(newf, 'Function'), '"newf" must be a function');
            var oldf = f;
            f = function () {
                oldf.apply(this, arguments);
                return newf.apply(this, arguments);
            };
            return callback;
        };
        callback.replace = function (newf) {
            f = isa(newf, 'Function') ? newf : function () {};
            return callback;
        };
        return callback;
    }
    var sck, self = this;
    self.onidle = link(on_idle);
    var idlectl = (function (func, timeout) {
                    assert(isa(func, 'Function'), '"func" must be a function');
                    var timer;
                    function refresh(t) {
                        window.clearInterval(timer);
                        if (isa(t, 'Number')) {
                            timeout = t;
                        }
                        if (isa(timeout, 'Number')) {
                            timer = window.setInterval(func, timeout);
                            //console.log('idle open interval  ' + timer + ' after ' + timeout);
                        } else {
                            //console.log('idle close interval ' + timer);
                            timer = undefined;
                        }
                    }
                    refresh.cancel = function () {
                        window.clearInterval(timer);
                        //console.log('idle close interval ' + timer);
                        timer = undefined;
                    };    
                    return refresh;
                })(self.onidle);

    self.onmessage = link(on_message);
    self.onsend = link(on_send);
    self.onopen = link(on_open);
    self.onclose = link(on_close);
    self.idle = function (timeout) {
        idlectl(timeout);
    };
    self.send = function () {};
    self.close = function () {
        if (sck !== undefined) {
            if ((sck.readyState !== sck.CLOSED) && (sck.readyState !== sck.CLOSING)) {
                sck.close();
            }
            sck = undefined;
        }
        idlectl.cancel();
        self.send = function () {};
    };
    self.ready = function () {
        return sck.readyState === sck.OPEN;
    };
    self.open = function (URL) {
        self.close();
        if (URL) {
            sck = new WebSocket(URL);
            sck.onmessage = function () {
                idlectl();
                return self.onmessage.apply(self, arguments);
            };
            sck.onopen = function () {
                self.send = function (data) {
                    var x = self.onsend.call(self, data);
                    if (x && (isa(x, 'String') || isa(x, 'ArrayBuffer'))) {
                        sck.send(x);
                    } else {
                        sck.send(data);
                    }
                    idlectl();
                }
                return self.onopen.apply(self, arguments);
            };
            sck.onerror = function () {
                self.close();
            };
            sck.onclose = function (evt) {
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
                self.send = function () {};
                idlectl.cancel();
                return self.onclose.call(self, evt, tbl[evt.code] === undefined ? "Unknown reason" : tbl[evt.code]);
            };
        }
    };
}




//onerror, onopen, onclose, onsend, onrecv
function Wshell(on_error, on_open, on_close, on_send, on_recv) {
    var ID, sck;
    var self = this;
    var callbacks = {};
    var retry = (function () {
        var timer;
        var func;
        var timeout;
        var enabled = true;
        var ret = function (f, t) {
            if (timer){
                window.clearTimeout(timer);
                timer = undefined;
            }
            func = f;
            timeout = t;
            if(isa(func, 'Function') && isa(t, 'Number') && enabled) {
                timer = window.setTimeout(function () {
                    timer = undefined;
                    func.call();
                }, timeout);
            }
        };
        ret.enable = function () {
            enabled = true;
        };
        ret.disable = function () {
            enabled = false;
        };
        return ret;
    })();
    var Handler =   (function () {
                        var dispatcher = {};
                        dispatcher.subscription = (function () {
                                var registration = {};
                                var ret = function (frm, dt, rplyf) {
                                    if (isa(registration[frm], 'Function')) {
                                        registration[frm].call(self, frm, dt);
                                    }
                                };
                                ret.register = function (path, func) {
                                    if (isa(func, 'Function')) {
                                        registration[path] = func;
                                    } else {
                                        delete registration[path];
                                    }
                                }
                                return ret;
                            })();
                        var ret = function (from, data, reply_func) {
                            if( data.handler) {
                                if (data.data && isa(dispatcher[data.handler], 'Function')) {
                                    //console.log('wshell handle_message for ' + data.handler);
                                    return dispatcher[data.handler].call(self, from,  data.data, reply_func);
                                }
                            } else {
                                try {
                                    var f = new Function('$reply', data);
                                    var ret = f.call(self, function(d) {
                                        if (d === undefined) {
                                            reply_func('undefined');
                                        } else {
                                            reply_func(d);
                                        }
                                    });
                                    if (ret !== undefined) {
                                        reply_func(ret);
                                    }
                                }catch(err){
                                    reply_func({
                                        result:'error', 
                                        data:jsonable(err)
                                    });
                                }
                            }       
                        };
                        ret.handlerSender = function(key) {
                            return function (to, msg, reply_to, on_reply) {
                                return self.send(to, {handler:key, data:msg}, reply_to, on_reply);
                            };
                        };
                        ret.setHandler = function (key, rcv) {
                            if (key !== 'subscription') {
                                if(isa(rcv, 'Function')) {
                                    dispatcher[key] = rcv;
                                    return ret.handlerSender(key);
                                } else {
                                    delete dispatcher[key];
                                }
                            }
                        };
                        ret.getHandler = function (key) {
                            return dispatcher[key];
                        };
                        ret.default_url = function (url) {
                            var info = hostinfo(url);
                            if(info){
    		                    if(info.protocol === 'http') {
    		                        if(info.port) {
    		                            return 'ws://'+ info.host + ':' + info.port + '/websocket';
    		                        } else {
    		                            return 'ws://'+ info.host + '/websocket'; 
    		                        }
    		                    } else if(info.protocol === 'https') {
    		                        if(info.port) {
    		                            return 'wss://'+ info.host + ':' + info.port + '/websocket';
    		                        } else {
    		                            return 'wss://'+ info.host + '/websocket'; 
    		                        }                                
    		                    }
                            }
                        };
                        ret.onerror = isa(on_error, 'Function') ? on_error : function (err) {
                            console.log('wshell.onerror');
                            console.log(err);
                        };
                        ret.onopen = isa(on_open, 'Function') ? on_open : function () {
                            console.log('wshell.onopen');
                        };
                        ret.onclose = isa(on_close, 'Function') ? on_close : function (evt, reason) {
                            console.log('wshell.onclose');
                            console.log(reason);
                            //if return true the wshell will NOT try to reconnect remote host
                        };
                        ret.onsend = isa(on_send, 'Function') ? on_send : function (d) {
                            //console.log('wshell.onsend');
                            //console.log(d);
                        };
                        ret.onrecv = isa(on_recv, 'Function') ? on_recv : function (d) {
                            //console.log('wshell.onrecv');
                            //console.log(d);
                        };                         
                        return ret;
                    })();
    function cleanup(){
        retry();
        if (sck) {
            sck.close();
            sck = undefined;
        }
        for (var i in callbacks) {
            if (callbacks.hasOwnProperty(i)) {
                window.clearTimeout(callbacks[i].t);
            }
        }
        callbacks = {};        
    }
    self.process = function (from, data, rplyf) {
        if (isa(Handler, 'Function')) {
            return Handler.call(self, from, data, rplyf);
        }
    };

    self.close = function (){
        cleanup();
        retry.disable();
    };
    function request(req, on_reply, to, reply_to) {
        var packet = {
            from : ID,
            type : "request",
            data : req
        };
        if (to) {
            packet.to = to;
        }
        if (reply_to) {
            packet.reply_to = reply_to;
        }
        if (isa(on_reply, 'Function')) {
            packet.id = Math.uuid(16);
            callbacks[packet.id] = {
                f:on_reply, 
                t:window.setTimeout(function (){
                        delete callbacks[packet.id];
                    }, 60000)
            };
        }
        sck.send(JSON.stringify(packet));
        return packet.id;
    }
    function handle_reply(data) {
        if (data.type === "request") {
            return data;
        } else if (data.type === "reply") {
            if (data.id in callbacks) {
                var rec = callbacks[data.id];
                window.clearTimeout(rec.t);
                delete callbacks[data.id];
                rec.f.call(self, data.from, data.data);
            } else {
                //Dangling reply should NOT be treated as an error
                //because sender could choose NOT to provide an on_reply handler 
                //but server will send back reply anyway
            }
        } else {
            if (isa(Handler.onerror, 'Function')) {
                Handler.onerror.call(self, {message:"Unknown packet", data:data})
            }
        }
    }
    function reply_callback(data) {
        return function (result) {
            var ret = {
                type: "reply",
                from: ID,
            };
            if (data["reply_to"] !== undefined) {
                ret.to = data.reply_to;
            } else if (data["from"] !== undefined) {
                ret.to = data.from;
            }
            if (ret.to) {
                if (data.id !== undefined) {
                    ret.id = data.id;
                }
                if (result !== undefined) {
                    ret.data = result;
                } else {
                    ret.data = 'undefined';
                }                
                try {
                    var json = JSON.stringify(ret);
                    sck.send(json);
                } catch (e) {
                }
            }
        }
    }
    Object.defineProperty(self, 'id', {
        get:function(){
            return ID;
        }
    });
    function firstOf(args, start, types, dfltv){
        var i;
        if(isa(types, 'String')){
            types = [types];
        }
        for(i=start; i< args.length; ++i){
            for(var t in types){
                if(isa(args[i], types[t]))
                    return args[i];
            }
        }
        return dfltv;
    }
    self.connect = function (dev) {
        ID = isa(dev, 'String') ? dev : ID;
        var URL = Handler.default_url(firstOf(arguments, 1, 'String'));
        var Information = firstOf(arguments, 1, 'Object');
        var connect_callback = firstOf(arguments, 1, 'Function');
        retry.enable();
        cleanup();
        sck = new Wsocket(function (){//open
            function on_connect_reply(frm, data) {
                if (data.result === "success") {
                    if (typeof(data.data.timeout) === 'number') {
                        sck.idle(data.data.timeout);
                    }
                }
                if (isa(Handler.onopen, 'Function')) {
                    Handler.onopen.call(self);
                }
                if (isa(connect_callback, 'Function')) {
                    connect_callback.call(self);
                }
            }
            if (Information) {
                return request({command:"connect", device:ID, info:Information}, on_connect_reply);
            } else {
                return request({command:"connect", device:ID}, on_connect_reply);
            }
        }, function (evt, reason) {//close
            if (isa(Handler.onclose, 'Function')) {
                Handler.onclose.call(self, evt, reason);
            }
            cleanup();
            retry(function () {
                self.connect(ID, Information, URL);
            }, 5000);
        }, function (evt) {//message
            try {
                if (isa(Handler.onrecv, 'Function')) {
                    Handler.onrecv.call(self, evt.data);
                }
                var data = handle_reply(JSON.parse(evt.data));
                if (data && data.data && isa(Handler, 'Function')) {
                    Handler.call(self, data.from, data.data, reply_callback(data));
                }
            }catch(e) {
                if (isa(Handler.onerror, 'Function')) {
                    Handler.onerror.call(self, {message:"Exception", data:e})
                }
            }            
        }, function (data) {//send
            if (isa(Handler.onsend, 'Function')) {
                return Handler.onsend.call(self, data);
            }
        }, function () {//idle
            request({command:"ping"});
        });
        sck.open(URL);
    };
    self.disconnect = function () {
        request({command:"disconnect"});
        self.close();
    };
    self.list = function (func) { //not implemented at server side
        return request({command:"list"}, func);   
    };    
    self.neibours = function (func) {
        return request({command:"neibours"}, func);
    };
    self.subscribe = function (paths, func) {
        if (isa(paths, 'Array')) {
            paths.forEach(function(e) {
                Handler.getHandler('subscription').register(e, func)
            });
        } else if (isa(paths, 'String')) {
            Handler.getHandler('subscription').register(paths, func);
        }
        return request({command:"subscribe", topic:paths}, function (frm, dat) {
                if (dat.result === 'success') {
                    func.call(self, frm, dat.data);
                }
            });
    };
    self.unsubscribe = function (paths) {
        if (isa(paths, 'Array')) {
            paths.forEach(function(e) {
                Handler.getHandler('subscription').register(e)
            });
        } else if (isa(paths, 'String')) {
            Handler.getHandler('subscription').register(paths);
        }
        return request({command:"unsubscribe", topic:paths});
    };
    self.kill = function (devices, func) {
        if(isa(devices, 'Array') && (devices.length > 0)) {
            return request({command:"kill", device:devices}, func);
        } else if (isa(devices, 'String')){
            return request({command:"kill", device:devices}, func);
        }        
    }
    self.join = function (devices, func) {
        if(isa(devices, 'Array') && (devices.length > 0)) {
            return request({command:"join", device:devices}, func);
        } else if (isa(devices, 'String')){
            return request({command:"join", device:devices}, func);
        }
    };
    self.leave = function (devices, func) {
        if(isa(devices, 'Array') && (devices.length > 0)) {
            return request({command:"leave", device:devices}, func);
        } else if (isa(devices, 'String')){
            return request({command:"leave", device:devices}, func);
        }
    };
    self.group = function (grp, dev, func) {
        return request({command:"group", group:grp, device:dev}, func);
    };
    self.dismiss = function (grp, func) {
        return request({command:"dismiss", group:grp}, func);
    };
    self.info = function (dev, func) {
        return request({command:"info", device:dev}, func);
    };
    self.send = function (to, data, reply_to, on_reply) {
        if (isa(to, 'String')) {
            if (isa(reply_to, 'Function')) {
                on_reply = reply_to;
                reply_to = undefined;
            }
            return request(data, on_reply, to, reply_to);
        }
    };    
    self.handlerSender = function (key){
        return Handler.handlerSender(key);
    };
    self.setHandler = function (key, rcv) {
        var snd = Handler.setHandler(key, rcv);
        return snd;
    };
    self.getHandler = function (key) {
        return Handler.getHandler(key);
    };
    self.ready = function(){
        if(sck){
            return sck.ready();    
        }
        return false;
    }
    self.scap = function (to, method, arg, on_reply) {
        var scap_dict = { getCurrentTime: 'Configuration', getPictureMode: 'Configuration',
            getPictureProperty: 'Configuration', setCurrentTime: 'Configuration',
            setPictureMode: 'Configuration', setPictureProperty: 'Configuration', getProperty: 'Configuration', setProperty: 'Configuration',
            getServerProperty: 'Configuration', setServerProperty: 'Configuration', getNetworkInfo: 'DeviceInfo', getNetworkMacInfo: 'DeviceInfo',
            getPlatformInfo: 'DeviceInfo', getSystemUsageInfo: 'DeviceInfo', initialize: 'InputSource', changeInputSource: 'InputSource',
            getInputSourceStatus: 'InputSource', enableAllOffTimer: 'Power', enableAllOnTimer: 'Power', enableWakeOnLan: 'Power',
            executePowerCommand: 'Power', getOffTimerList: 'Power', getOnTimerList: 'Power', getPowerStatus: 'Power',
            setDisplayMode: 'Power', addOffTimer: 'Power', deleteOffTimer: 'Power', addOnTimer: 'Power',
            deleteOnTimer: 'Power', setPortraitMode: 'Signage', setFailoverMode: 'Signage', getFailoverMode: 'Signage',
            setTileInfo: 'Signage', getTileInfo: 'Signage', getSignageInfo: 'Signage', setIsmMethod: 'Signage',
            setDigitalAudioInputMode: 'Signage', registerSystemMonitor: 'Signage',
            unregisterSystemMonitor: 'Signage', getSystemMonitoringInfo: 'Signage', setPowerSaveMode: 'Signage', getPowerSaveMode: 'Signage',
            setUsagePermission: 'Signage', getUsagePermission: 'Signage', getUsageData: 'Signage', captureScreen: 'Signage',
            getSoundStatus: 'Sound', setVolumeLevel: 'Sound', setExternalSpeaker: 'Sound', setMuted: 'Sound',
            copyFile: 'Storage', getStorageInfo: 'Storage', listFiles: 'Storage', removeFile: 'Storage',
            upgradeApplication: 'Storage', removeApplication: 'Storage', downloadFirmware: 'Storage', upgradeFirmware: 'Storage',
            getFirmwareUpgradeStatus: 'Storage', changeLogoImage: 'Storage',
            writeFile: 'Storage', readFile: 'Storage', moveFile: 'Storage', removeAll: 'Storage',
            statFile: 'Storage', unzipFile: 'Storage', fsync: 'Storage', getVideoStatus: 'Video', setVideoSize: 'Video'};  
        var module = scap_dict[method];
        if (module) {
            if(isa(arg, 'Function')) {
                on_reply = arg;
                arg = undefined;
            }
            var cmd = "(new " + module + "())." + method + "(function (d){$reply({result:'success',data:d})}, function (d) {$reply({result:'error',data:d})}";
            if (arg) {
                cmd = cmd + ", "  + JSON.stringify(arg) + ");";
            } else {
                cmd = cmd + ");";
            }
            return self.send(to, cmd, on_reply);
        }
    };
    /*
    self.load = function (filetype, URL, s, f) {
        try{
            if (filetype=="js"){ //if filename is a external JavaScript file
                $.getScript(URL, function (data, textStatus, jqxhr) {
                    if (typeof(s) === "function") {
                        s(URL);
                    }
                }).fail(function (jqxhr, settings, exception) {
                    if(typeof(f) === "function") {
                        f(URL, exception);
                    }
                });
            } else if (filetype=="css"){ //if filename is an external CSS file
                $.get(URL, function(data){
                            $("head").append('<style type="text/css">' + data + "</style>");
                            if (typeof(s) === "function") {
                                s(URL);
                            }
                        }).fail(function (jqxhr, settings, exception){
                            console.log("Load " + URL + " fail!");
                            if(typeof(f) === "function") {
                                f(URL, exception);
                            }
                        });
            }
        }catch(e) {
            f(URL, e)
        }
    };
    self.loadAll = function (URLs, func){
        var count = URLs.length;
        var good = [];
        var bad = [];
        for(var i in URLs) {
            self.load(URLs[i].type, URLs[i].url, function (u){
                count--;
                good.push(u);
                if (count === 0) {
                    if (typeof(func) === "function") {
                        func(good, bad);
                    }
                } 
            }, function (u, err) {
                count--;
                bad.push({url:u, exception:err});
                if (count === 0) {
                    if (typeof(func) === "function") {
                        func(good, bad);
                    }
                }
            });
        }
    };
    self.loadSeq = function (URLs, func) {
        var good = [];
        function fnext(u, _err) {
            func(good, [u]);
        }
        function snext(index) {
            return function(u) {
                if (index < URLs.length) {
                    if (u !== undefined){
                        good.push(u);
                    }
                    self.load(URLs[index].type, URLs[index].url, snext(index + 1), fnext);
                } else {
                    func(good, []);
                }
            }
        }
        snext(0)();
    };
    */
}


function Sync(url, onupdate, update_this){
    var wshellobj, timer, self = this;
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
    function retrieve(onerror, ondone, onalways, ethis){
        $.ajax({
            cache: false,
            url: url,
            dataType: "json",
            jsonp : false
        }).fail(function (e, e1, e2) {
            console.log("GET " + url + " Fail.");
            if (isa(onerror, 'Function')) {
                onerror.call(ethis, e, e1, e2);
            }
        }).done(function (data) {
            console.log("GET " + url + " Success.");
            if(isa(ondone, 'Function')){
                ondone.call(ethis, data);
            }
            self.set(data, true);
        }).always(function (){
            if(isa(onalways, 'Function')){
                onalways.call(ethis);
            }
        });
    }
    self.forceUpdate = function(onerror, ethis){
        retrieve(onerror, function(data){
            self.set(data, true);
        }, null, ethis);
        return self; 
    };    
    self.downloadOnce = function (onerror, ethis) {
        retrieve(onerror, function(data){
            self.set(data);
        }, null, ethis);
        return self;        
    };
    self.download = function (onerror, ethis) {
        self.stopDownload();
        retrieve(onerror, function(data){
            self.set(data);
        }, function(){
            timer = window.setTimeout(function(){
                self.download(onerror, ethis);
            }, 20000);
        }, ethis);
        return self;
    };
    self.monitor = function (ws) {
        if(isa(wshellobj, 'Object')) {
            wshellobj.unsubscribe(url);
        }
        if(wshellobj !== ws) {
            wshellobj = ws;
        }
        if(wshellobj) {
            wshellobj.subscribe(url, function(from, data, rplyf){
                console.log(url + ' from wshell ' + data);
                self.set(data);
            });
        }
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
function Scheduler(schedules, switchChannel) {
    function schedule(s) {
        function process(schs, when) {
            /*
                schs := [{
                    date_spec:"$year>1901 && $month < 10 && $day > 2 && $weekday === 3 ... ",
                    channel_spec:[{
                            time_spec:"23:13:01",
                            channel:"channel name 1"
                        },{
                            time_spec:"9:13", // === 09:13:00
                            channel:"channel name 2"    
                        }......]}]
            */
/*            function is_effective(when) {
                when = isa(when, 'Date') ? when : new Date(when);
                return function (date_spec) {//calculate the effectiveness with respect to when
                    try {
                        if (isa(date_spec, 'String')) {
                            date_spec = new Function('$datetime', '$year', '$month', '$day', '$weekday', 'return (' + date_spec + ');');
                        } 
                        if (isa(date_spec, 'Function')) {
                            return date_spec.call(undefined, when, when.getFullYear(), when.getMonth() + 1, when.getDate(), when.getDay());
                        } else if (isa(date_spec, 'Undefined')) {
                            return true;
                        } else if (isa(date_spec, 'Date')) {
                            return      date_spec.getFullYear() === when.getFullYear() 
                                    &&  date_spec.getMonth() === when.getMonth()
                                    &&  date_spec.getDate() === when.getDate();
                        }   
                    } catch(e) {
                    }
                }
            }
            when = isa(when, 'Date') ? when : new Date(when);
            when.setMilliseconds(0);
            var eft = is_effective(when);
            schs = schs.filter(function (s) {
                return eft(s.date_spec);
            }).map(function (s){//strip off the date_spec
                return s.channel_spec;
            });
            schs = [].concat.apply([], schs).map(function (c) {
                c.specificity = 0;//add specificity to channel spec
                if (isa(c.time_spec, 'String') && (c.time_spec.trim().length > 0)) {
                    //[[channel_spec],[channel_spec],...] => [channel_spec, channel_spec, ...]
                    //use Date() for good time_spec, undefined for empty time_spec and String for bad time_spec
                    c.specificity++;//time_spec is not empty
                    c.time_spec = c.time_spec.trim();
                    var m = c.time_spec.match(/^([0-9]+):([0-9]+)(:([0-9]+))?/);
                    if (m) {//the more is specified the higher specificity is
                        var hour = parseInt(m[1], 10);                 c.specificity++;
                        var minute = parseInt(m[2], 10);               c.specificity++;
                        var second = m[4] ? parseInt(m[4], 10) : 0;    c.specificity += m[4] ? 1 : 0;
                        c.time_spec = new Date(when);
                        c.time_spec.setHours(hour);
                        c.time_spec.setMinutes(minute);
                        c.time_spec.setSeconds(second);
                        return c;
                    } else if(m = c.time_spec.match(/^(([0-9]+)-)?([0-9]+)-([0-9]+) ([0-9]+):([0-9]+)(:([0-9]+))?/)) {
                        var year = m[2] ? parseInt(m[2], 10) : 0;      c.specificity += m[2] ? 1 : 0;
                        var month = parseInt(m[3], 10);                c.specificity++;
                        var day = parseInt(m[4], 10);                  c.specificity++;
                        var hour = parseInt(m[5], 10);                 c.specificity++;
                        var minute = parseInt(m[6], 10);               c.specificity++;
                        var second = m[8] ? parseInt(m[8], 10) : 0;    c.specificity += m[8] ? 1 : 0;
                        c.time_spec = new Date(year, month, day, hour, minute, second, 0);
                        return c;
                    } else {
                        c.time_spec = 'Bad time spec:' + c.time_spec;
                        return c;
                    }
                } else {//time_spec is NOT string but undefined 
                    //specificity should be 0
                    c.time_spec = undefined;
                    return c;
                }
            });
            //format error
            var bad_time_spec = schs.filter(function (c) {
                return isa(c.time_spec, 'String');
            });
            //no time_spec this is the default channel for all the time
            var defaults = schs.filter(function (c) {
                return  isa(c.time_spec, 'Undefined');
            });
            //normal channel schedule
            var schs = schs.filter(function (c) {
                return isa(c.time_spec, 'Date');
            }).sort(function (a, b){
                //sort by time_spec, time_spec should be Date object which is good at < or >, but not == != === !== 
                if (a.time_spec < b.time_spec) {
                    return -1;
                } 
                if (a.time_spec > b.time_spec) {
                    return 1;
                }
                return 0;
            });
            
            //group all channels by time_spec
            var acc = []
            for(var i = 0; i<schs.length-1; ++i) {
                var ch = schs[i];
                var cdata = {channel:ch.channel, specificity:ch.specificity};
                var last = acc.length > 0 ? acc[acc.length-1] : null;
                
                if((acc.length === 0) //acc is empty || the time spec !== the last element in acc
                    || (+last.time_spec !== +ch.time_spec)) {
                    acc.push({
                        time_spec:ch.time_spec,
                        channels:[cdata]
                    });
                } else if(!last.channels.some(function (v) {
                                return (cdata.channel === v.channel) && (cdata.specificity === v.specificity);
                                            })) {
                    last.channels.push(cdata);
                }
            }
            schs = acc.map(function (c) {
                //the input element is the channels for one time_spec
                var tmp = {};
                //group by channel name
                c.channels.forEach(function (v) {
                    if (isa(tmp[v.channel], 'Undefined')) {
                        tmp[v.channel] = v.specificity;
                    } else if (tmp[v.channel] < v.specificity) {
                        tmp[v.channel] = v.specificity;
                    }
                });
                //for the same channel only keep the entry with highest specificity
                c.channels = [];
                for (var i in tmp) {
                    if(tmp.hasOwnProperty(i)){
                        c.channels.push({channel:i, specificity:tmp[i]});
                    }
                }
                //sort by specificity
                c.channels.sort(function (a, b) {
                    if (a.specificity < b.specificity){
                        return -1;
                    } else if(a.specificity > b.specificity) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
                //duplicated specificity is treated as conflict
                c.conflict = c.channels.some(function (v, i, a){
                    if (i < a.length - 1) {
                        return v.specificity === a[i+1].specificity;
                    }
                });
                return c;
            });
            when.setHours(0);
            when.setMinutes(0);
            when.setSeconds(0);
            when.setMilliseconds(0);
            return {
                datestamp: new Date(when),
                normal:schs,
                always:defaults,
                bad: bad_time_spec
            };
            /*{normal: [{   time_spec: Date() object,
                            conflict:false;
                            channels:[{
                                    channel:"channel name 1",
                                    specificity:1
                                }]},{
                            time_spec: Date() object,
                            conflict:true
                            channels:[{//this is a conflict
                                    channel:"channel name 1",
                                    specificity:1
                                },{
                                    channel:"channel name 2",
                                    specificity:1
                                }]}......],
                    always:[{
                            channel:"channel name 1",
                            specificity:1
                        }...],
                    bad:[{ //the format of time_spec is wrong
                            time_spec:"xxxxx",
                            channel:"channel name"
                        }......]}*/
/*        } 
        var data;
        function refresh(t) {
            t = isa(t, 'Date') ? t : new Date(t);
            var tmp = new Date(t);
            tmp.setHours(0);
            tmp.setMinutes(0);
            tmp.setSeconds(0);
            tmp.setMilliseconds(0);
            if (!data || (+tmp !== +data.datestamp)) {
                data = process(s, t);
            }
            return data;
        }
        return function (t) {
            t = isa(t, 'Date') ? t : new Date(t);
            var tmp = refresh(t);
            /*normal: [{
                    time_spec: Date() object,
                    conflict:false;
                    channels:[{
                            channel:"channel name 1",
                            specificity:1
                        }]}, 
            always:[{
                        channel:"channel name 1",
                        specificity:1
                    }]*/
/*            var found = (function () {
                            for(var i = 0; i< tmp.normal.length - 1; ++i) {
                                if (t >= tmp.normal[i].time_spec) {
                                    if (t <= tmp.normal[i+1].time_spec) {
                                        return i;
                                    }
                                }
                            }
                        })();
            if (isa(found, 'Number')) {
                if (tmp.normal[i].conflict) {
                    found = undefined;
                }
            }
            if (found) {
                var a = tmp.normal[found].channels;
                return a[a.length-1].channel;
            } else {
                if (tmp.always.length > 0) {
                    return tmp.always[0].channel;
                }
            }
        };
    }
    var self = this;
    var schobj = schedule(schedules);
    var current_channel;
    var timer;
    var all_channels=(function (sch){
        var acc = {};
        sch.forEach(function(s){
            s.channel_spec.forEach(function(ch){
                acc[ch.channel] = true;
            });
        });
        var ret = [];
        for(var i in acc){
            if(acc.hasOwnProperty(i)){
                ret.push(i);
            }
        }
        return ret;
    })(schedules);
    function tick() {
        var ch = schobj(new Date());
        if (current_channel !== ch) {
            if (isa(switchChannel, 'Function')) {
                switchChannel.call(self, ch);    
            } else {
                console.log('Need to switch channel to ' + ch);
            }
            current_channel = ch;
        }
    }
    self.channels = function () {
        return all_channels;
    };
    self.channelAt = function (when) {
        return schobj(new Date(when));
    };
    self.start = function (func) {
        switchChannel = isa(func, 'Function') ? func : switchChannel;
        tick();
        window.setInterval(tick, 10000);
    };
    self.stop = function () {
        window.clearInterval(timer);
        console.log('schedule close interval ' + timer);        
        timer = undefined;
    };
}*/

function Channel(channel_view)  {
    var self = this;
    var channels = [];
    self.setChannels = function (ch) {
        if(isa(ch, 'Array')) {
            channels = ch;    
        } else if (isa(ch, 'String')) {
            channels = [ch];
        }
        return self;
    };
    self.previous = function (){
        if(channels.length > 0) {
            var current = channel_view.attr('src');
            var index = channels.indexOf(current);
            if(index <= 0) {
                self.switchCh(channels.length - 1);
            } else {
                self.switchCh(index - 1);
            }
        }            
    };
    self.next =  function (){
        if(channels.length > 0) {
            var current = channel_view.attr('src');
            var index  = channels.indexOf(current);
            if((index < 0) || (index === (channels.length-1))) {
                self.switchCh(0);
            } else {
                self.switchCh(index + 1);
            }
        }
    };
    self.switchCh = function (url) {
        if(channels.length>0){
            if(isa(url, 'Number')){            
                url = channels[url % channels.length];
                channel_view.attr('src', url).show();
            } else if(isa(url, 'String')) {
                var index = channels.indexOf(url); 
                if( (index >= 0) && (index < channels.length) ) {
                    channels.push(url);
                }
            }
        }
        return self;
    };
    self.channelCmd = function(cmd, arg){
        self.postMessage({
            type:"request",
            method:cmd,
            argument:arg
        });                    
    };
    self.postMessage = function(msg) {
        if (channel_view) {
            channel_view.get(0).contentWindow.postMessage(msg, '*');
        }
        return self;
    };
    self.clear = function (){
        channels = [];
        channel_view.attr('src','').hide();
    };
}



function obj2html(_name_, _obj_, _is_template_) {
    function field_control(){
        var $span=$("<span  data-role='field-control'></span>").hide();
        var $del=$("<button type='button' data-role='btn-del'>X</button>").hide();
        var $add=$("<button type='button' data-role='btn-add'>+</button>").hide();
        var $up =$("<button type='button' data-role='btn-up'>^</button>").hide();
        var $down=$("<button type='button' data-role='btn-down'>v</button>").hide();
        var $toggle=$("<input type='checkbox' data-role='btn-toggle'>").hide();
        $span.append($toggle, $up, $down, $add, $del);
        var ext = {
            btn_del:$del,
            btn_toggle:$toggle,
            btn_add:$add,
            btn_up:$up,
            btn_down:$down,
            showBtn:function(cfg) {
                for(var i in cfg) {
                    if(cfg.hasOwnProperty(i)) {
                        $span.data('ext')['btn_' + i].show();
                    }
                }
            }
        };
        $span.data('ext', ext);
        return $span;
    }
    function primitive_field(name, type, value) {
        function type2input(){
            if(type === 'Date') {
                return 'date';
            } else if(type === 'Time') {
                return 'time';
            }else if(type === 'Number') {
                return 'number';
            } else if(type === 'Boolean') {
                return 'checkbox';
            } else if(type === 'File') {
                return 'file';
            } else {
                return 'text';
            } 
        }
        var uname = name + '.' + Math.uuid(16);
        var $field = $("<div/>",{"data-role":"field", "data-field-type":type});
        var $control = field_control();
        var $name = $("<label data-role='field-name' for='" + uname + "'>" + name + "</label>");
        var $value= $("<input data-role='field-value' id='" + uname 
                    + "' type='" + type2input() + "' name='" + name + "'>").val(value);
        $field.append($control, $name, $value);
        var ext = {
            control:$control,
            name:function(){
                return name;
            },
            value:function(v) {
                if (type === 'Boolean') {
                    if(v === undefined){
                        return $value.is(':checked');
                    } else {
                        $value.prop('checked', v);
                    }
                } else {
                    if(v === undefined) {
                        return $value.val();
                    } else {
                        $value.val(v);
                    }
                }
            },
            copy:function(){
                return primitive_field(name, type, value);
            }
        };
        $field.data('ext', ext);
        return $field;
    }
    function array_field(name, $tmplt) {
        var $field = $("<div/>",{"data-role":"field", "data-field-type":"[]"});
        var $control = field_control();
        var $name = $("<span data-role='field-name'>" + name + "</span>");
        var $value= $("<ul data-role='field-value'>");
        $field.append($control, $name, $value);
        $control.show().data('ext').showBtn({toggle:true, add:true});
        $control.data('ext').btn_toggle.click(function(){
            if($control.data('ext').btn_toggle.prop('checked')){
                $value.show();
            } else {
                $value.hide();
            }
        });
        $control.data('ext').btn_add.click(function(){
            ext.newItem();
        });
        $value.hide();
        function add_item($newitem){
            $newitem.appendTo($value);
            $newitem.data('ext').control.show().data('ext').showBtn({del:true, up:true, down:true});
            $newitem.data('ext').control.data('ext').btn_del.click(function (e) {
                $newitem.remove();
                e.stopPropagation();
            });
            $newitem.data('ext').control.data('ext').btn_up.click(function (e) {
                var $sibling = $value.children();
                var index = $sibling.index($newitem);
                if(index > 0) {
                    $newitem.insertBefore($sibling[index-1]);
                }
                e.stopPropagation();
            });
            $newitem.data('ext').control.data('ext').btn_down.click(function(e){
                var $sibling = $value.children();
                var index = $sibling.index($newitem);
                if (index < $sibling.length - 1) {
                    $newitem.insertAfter($sibling[index + 1]);
                }
                e.stopPropagation();
            });
        }
        var ext = {
            control:$control,
            template:undefined,
            name:function() {
                return name;
            },
            value:function(v) {
                if(v === undefined) {
                    var result = [];
                    $value.children().each(function(){
                        result.push($(this).data('ext').value());
                    });
                    return result;
                } else if(isa(v, 'Array')){
                    $value.empty();
                    for(var i=0; i<v.length; ++i) {
                        var $item = ext.newItem();
                        if($item) {
                            $item.data('ext').value(v[i]);
                        }
                    }
                } else {
                    $value.empty();
                }
            },
            push:function ($v) {
                if (undefined === ext.template) {
                    ext.template = $v.data('ext').copy();
                }
                add_item($v);
            },
            newItem:function(){
                if(ext.template) {
                    var $newitem = ext.template.data('ext').copy();
                    add_item($newitem);
                    return $newitem;
                }
            },
            collapse:function(){
                $value.hide();
            },
            expand:function(){
                $value.show();
            },
            copy:function(){
                var ret = array_field(name, ext.template);
                var v = ext.value();
                ret.data('ext').value(v);
                return ret;
            }
        };
        if($tmplt) {
            ext.template = $tmplt.data('ext').copy();
        }              
        $field.data('ext', ext);
        return $field;              
    }
    function object_field(name, $fs) {
        var $field = $("<div/>",{"data-role":"field", "data-field-type":"{}"});
        var $control = field_control();
        var $name = $("<span data-role='field-name'>" + name + "</span>");
        var $value= $("<ul data-role='field-value'>");  
        $field.append($control, $name, $value);
        $control.show().data('ext').showBtn({toggle:true});
        $control.data('ext').btn_toggle.click(function(){
            if($control.data('ext').btn_toggle.prop('checked')){
                $value.show();
            } else {
                $value.hide();
            }
        });    
        if($fs) {
            $fs.each(function(){
                $value.append($(this).data('ext').copy());
            });
        }
        $value.hide();
        var ext = {
            control:$control,
            name:function(){
                return name;
            },
            value:function(v) {
                if(v === undefined) {
                    var result = {};
                    $value.children().each(function(){
                        var n = $(this).data('ext').name();
                        var v = $(this).data('ext').value();
                        result[n] = v;       
                    });
                    return result;
                } else if (isa(v, 'Object')){
                    $value.children().each(function(){
                        $(this).data('ext').value(v[$(this).data('ext').name()]);
                    });
                } else {
                    
                }
            },
            push:function($v){
                $v.appendTo($value);
            },
            collapse:function(){
                $value.hide();
            },
            expand:function(){
                $value.show();
            },
            copy:function() {
                var ret = object_field(name, $value.children());
                var v = ext.value();
                ret.data('ext').value(v);
                return ret;
            }
        };
        $field.data('ext', ext);
        return $field;                                                  
    }
    function enumerate(name, any, func, state) {
        var typ = type(any);
        if(     (typ === 'Number') 
            ||  (typ === 'String')
            ||  (typ === 'RegExp')
            ||  (typ === 'Date') 
            ||  (typ === 'Boolean') 
            ||  (typ === 'Undefined') 
            ||  (typ === 'HTMLDocument') 
            ||  (typ === 'Window') 
            ||  (typ === 'Null')  
            ||  (typ === 'Function')) {
            return func.call(state, name, typ, any);
        } else if(typ === 'Array') {
            state = func.call(state, name, '[');
            for(var i = 0; i < any.length; ++i) {
                state = enumerate(i, any[i], func, state)
            }
            return func.call(state, name, ']');
        } else if(typ === 'Object') {
            state = func.call(state, name, '{');
            for (var i in any) {
                if (any.hasOwnProperty(i)) {
                    state = enumerate(i, any[i], func, state);
                }
            }
            return func.call(state, name, '}')
        } else {
            return func.call(state, name, typ, any);
        }
    }          
    return (function (name, obj, is_template) {
        var typ = type(obj);
        if (typ === 'String') {
            if(is_template) {
                return primitive_field(name, obj, obj);
            } else {
                return primitive_field(name, typ, obj);
            }
        } else if ( (typ === 'Number') 
                ||  (typ === 'Date') 
                ||  (typ === 'Boolean') 
                ||  (typ === 'RegExp')
                ||  (typ === 'Undefined')
                ||  (typ === 'Null') ) {
            return primitive_field(name, typ, obj);
        } else if(typ === 'Array') {
            var $field = array_field(name);
            for(var i = 0; i < obj.length; ++i) {
                $field.data('ext').push(obj2html('', obj[i], is_template));
            }
            return $field;
        } else if(typ === 'Object') {
            var $field = object_field(name);
            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    $field.data('ext').push(obj2html(i, obj[i], is_template));
                }
            }
            return $field;
        } 
    })(_name_, _obj_, _is_template_);
}      
