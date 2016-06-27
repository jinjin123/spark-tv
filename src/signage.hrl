-define(TIMEOUT, (1 * 60 * 1000) ).

-record(store, {key= <<>>, last_modified= <<>>, value= <<>>}).
%for message routing
%database bag disk/memory
-record(device, {id= <<>>, pid= <<>>}).
%database table memory only
-record(pid, {id= <<>>, device= <<>>, public_ip= <<>>, info= <<>>}).

-record(wstate, {pid, ip}).


%for store/device management
%database bag disk/memory
%-record(store,  {id= <<>>, screen= <<>>}).
%database bag disk/memory
%-record(screen, {id= <<>>, device= <<>>}).
%id refers to device ID
%-record(tile,   {id= <<>>, tile=false, row=1, column=1, tileid=1, natural_mode=false}).
