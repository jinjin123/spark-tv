/*jslint devel: true */
/*global saveStorage: true, $: true, loadStorage: true, log: true, AndroidVideo: true, parseRawLists: true */
if (window.Signage) {
    window.Repository = function(prefix){
        prefix = prefix ? ("file://internal/" + prefix) : "file://internal/";
        var self = this;
        function exists(filename, then, fail, xthis){
            (new Storage()).exists(function(d){
                console.log('exists ' + filename + ' [' + d.exists + ']');
                if(isa(then, 'Function')){
                    then.call(xthis, d);    
                }
            }, function(err){
                console.log( "exists Error Code [" + err.errorCode + "]: " + err.errorText);
                if(isa(fail, 'Function')) {
                    fail.call(xthis, err);    
                }
            },{path:prefix + filename});
        }
        function ls(then, fail, xthis){
            (new Storage()).listFiles(function(d){
                console.log('listFiles ' + prefix);
                if(isa(then, 'Function')){
                    then.call(xthis, d);    
                }
            }, function(err){
                console.log( "listFiles Error Code [" + err.errorCode + "]: " + err.errorText);
                if(isa(fail, 'Function')) {
                    fail.call(xthis, err);    
                }
            },{path:prefix});            
        }
        function rm(filename, then, fail, xthis){
            (new Storage()).removeFile(function(d){
                console.log('removeFile ' + filename);
                if(isa(then, 'Function')){
                    then.call(xthis, d);    
                }
            }, function(err){
                console.log( "removeFile Error Code [" + err.errorCode + "]: " + err.errorText);
                if(isa(fail, 'Function')) {
                    fail.call(xthis, err);    
                }
            },{file:prefix + filename});            
        }
        function mv(oldp, newp, then, fail, xthis){
            (new Storage()).moveFile(function(d){
                console.log('moveFile ' + oldp + ' to ' + newp);
                if(isa(then, 'Function')){
                    then.call(xthis, d);    
                }
            }, function(err){
                console.log('Cannot moveFile ' + oldp + " to " + newp);
                console.log( "moveFile Error Code [" + err.errorCode + "]: " + err.errorText);
                if(isa(fail, 'Function')) {
                    fail.call(xthis, err);    
                }
            }, {oldPath:prefix + oldp, newPath:prefix + newp});
        }
        function append(filename, buf, then, fail, xthis){
            (new Storage()).writeFile(function(d){
                console.log('writeFile ' + filename);
                if(isa(then, 'Function')){
                    then.call(xthis, d);    
                }
            }, function(err){
                console.log( "writeFile Error Code [" + err.errorCode + "]: " + err.errorText);
                if(isa(fail, 'Function')) {
                    fail.call(xthis, err);    
                }
            }, {data: buffer,
                path: prefix + filename,
                mode :'append',
                length : buffer.byteLength(),
                encoding: 'binary'});
        }

        function download(url, filename, then, fail, xthis){
/*            
            var tmpname = prefix + filename;
            console.log('start download ' + url);
            console.log('to ' + tmpname);
            (new Storage()).copyFile(function(d){
                console.log('copyFile ' + filename + ' from ' + url + ' successfully!');
                if(isa(then, 'Function')){
                    then.call(xthis, d);    
                }
            }, function(err){
                console.log( "copyFile Error Code [" + err.errorCode + "]: " + err.errorText);
                if(isa(fail, 'Function')) {
                    fail.call(xthis, err);    
                }
            },{source:url,destination:tmpname});            
*/            
            
            var tmpname = filename + '.tmp';
            console.log('start download ' + url);
            console.log('to ' + tmpname);
            (new Storage()).copyFile(function(d){
                console.log('copyFile ' + filename + ' from ' + url + ' successfully!');
                mv(tmpname, filename, function(d){
                    if(isa(then, 'Function')){
                        then.call(xthis, d);    
                    }                                        
                }, function(err){
                    if(isa(fail, 'Function')) {
                        fail.call(xthis, err);    
                    }                    
                    rm(tmpname);    
                });    
            }, function(err){
                console.log( "copyFile Error Code [" + err.errorCode + "]: " + err.errorText);
                if(isa(fail, 'Function')) {
                    fail.call(xthis, err);    
                }
                rm(tmpname);
            },{source:url,destination:prefix + tmpname});
        }
        var download_list = {};
        self.download = function(url, filename){
            exists(filename, function(e){
                if(!e.exists){
                    if(!(filename in download_list)){
                        download_list[filename] = true;
                        download(url, filename, function(){
                            delete download_list[filename];
                        },function(){
                            delete download_list[filename];
                        });
                    }else{
                        console.log(filename + ' is downloading');
                    }
                }else{
                    console.log(filename + ' ready exists on disk');
                }
            });
        };
        self.ls = function(then, fail, xthis){
            ls(then, fail, xthis);
        };
        self.rm = function(filename, then, fail, xthis){
            if(filename in download_list) {
                delete download_list[filename];
            }
            rm(filename, then, fail, xthis);
        };
        self.clean = function(keep){
            keep = isa(keep, 'String') ? [keep] : keep;
            keep = isa(keep, 'Array') ? keep : [];
            ls(function(olds){
                if(isa(olds.files, 'Array')){
                    olds.files.forEach(function(old){
                        if(old.type !== 'folder'){
                            var m = old.name.match(/(.*)\.tmp/);
                            if(m) {
                                if(!(m[1] in download_list)){
                                    rm(old.name);
                                }
                            } else {
                                if(!keep.some(function(item){return item === old.name})){
                                    rm(old.name);
                                }                            
                            }
                        }
                    })
                }
            });
        };
        self.mv = function(oldp, newp, then, fail, xthis){
            mv(oldp, newp, then, fail, xthis);
        };
        self.exists = function(filename, then, fail, xthis){
            exists(filename, then, fail, xthis);
        };
    };
    (function(){
        function restart(){
            (new Configuration()).restartApplication(function(){
                console.log("Restart Application Success");
            }, function (err){
                console.log("Restart Application Fail [" + err.errorCode + "] " + err.errorText);
            });
        }
        function debug_mode(d){
            (new Configuration()).debug(function () {
                console.log("In debug mode!");
            }, function () {
                console.log("Fail to debug!");
            }, {enabled:d});                     
        }    
        function power (reboot) {
            if(reboot){
                (new Power()).executePowerCommand(function(){}, function(err){
                    console.log ("REBOOT Fail [" + err.errorCode + "] " + err.errorText);   
                }, {powerCommand:Power.PowerCommand.REBOOT});
            } else {
                (new Power()).executePowerCommand(function(){}, function(err){
                    console.log ("SHUTDOWN Fail [" + err.errorCode + "] " + err.errorText);   
                }, {powerCommand:Power.PowerCommand.SHUTDOWN});                        
            }
        }
        function wake_on_lan(w){
            (new Power()).enableWakeOnLan(function(){
                console.log("Wake On LAN is " + w?"on":"off");
            }, function (err){
                console.log("Set Wake On LAN fail [" + err.errorCode + "] " + err.errorText);
            }, {wakeOnLan:w});
        }
        function display(on) {
            (new Power()).setDisplayMode(function (){
                console.log("display is " + on?"on":"off");
            }, function(err){
                console.log("Power.setDisplayMode Fail [" + err.errorCode + "] " + err.errorText);
            }, {displayMode:on?Power.DisplayMode.DISPLAY_ON:Power.DisplayMode.DISPLAY_OFF});
        }            
        function power_saving_off(){
            var options = { 
                powerSaveMode: {
                    ses: false,
                    dpmMode: Signage.DpmMode.OFF,
                    automaticStandby: Signage.AutomaticStandbyMode.OFF,
                    do15MinOff: false,
                }
            };
            (new Signage()).setPowerSaveMode(function(){
                console.log("Power Save Mode is off");
            }, function(err){
                console.log("Signage.setPowerSaveMode Fail [" + err.errorCode + "] " + err.errorText);
            }, options);
        }
        function allow_key_access(){
            var options = { 
                policy: {
                    remoteKeyOperationMode: Signage.KeyOperationMode.ALLOW_ALL,
                    localKeyOperationMode: Signage.KeyOperationMode.ALLOW_ALL,
                }
            }; 
            (new Signage()).setUsagePermission(function(){
                console.log("Key Access is ALLOW_ALL");
            }, function (err){
                console.log("Signage.setUsagePermission Fail [" + err.errorCode + "] " + err.errorText);
            }, options);            
        }
        function failover(){
            var options = { 
                failoverMode : {
                    mode: Signage.FailoverMode.MANUAL,
                    priority : [
                         'ext://hdmi:1'
                        ,'ext://hdmi:2'
                        ,'ext://dp:1'
                        ,'ext://dvi:1'
                        ,'ext://rgb:1']
                }
            }; 
            (new Signage()).setFailoverMode(function(){
                console.log("Failover Mode is MANUAL");
            }, function (err){
                console.log("Signage.setFailoverMode Fail [" + err.errorCode + "] " + err.errorText);
            }, options);              
        }
        debug_mode(true);
        wake_on_lan(true);
        display(true);
        power_saving_off();
        allow_key_access();
    })();    
} else {
    window.Repository = function(prefix){
        function fake(then, xthis){
            window.setTimeout(function(){
                if(isa(then, 'Function')){
                    then.call(xthis, {exists:false, files:[]});    
                }
            }, 200);            
        }
        var self = this;
        var download_list = {};
        self.download = function(url, filename, then, fail, xthis){
            fake(function(e){
                if(!e.exists){
                    if(!(filename in download_list)){
                        download_list[filename] = true;
                        window.setTimeout(function(){
                            delete download_list[filename];
                        }, 60000);
                    }
                }
            }, xthis);
        };
        self.ls = function(then, fail, xthis){
            fake(then, xthis);
        };
        self.rm = function(filename, then, fail, xthis){
            if(filename in download_list) {
                delete download_list[filename];
            }
            fake(then, xthis);
        };
        self.clean = function(keep, del_tmp){
        };
        self.exists = function(filename, then, fail, xthis){
            fake(then, xthis);
        };
    };
}




