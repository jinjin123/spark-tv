-module(signage).
-include_lib("stdlib/include/qlc.hrl").
-include_lib("signage.hrl").
-export([start/0, stop/0, create_table/0]).
-export([dismiss/1, group/2, connect/3, connect/4, disconnect/1, resolve/1, neibours/1, list/0, info/1, join/2, leave/2]).
-export([save/2, load/1, delete/1, normalize_path/1]).



normalize_path_list([])->[];
normalize_path_list([$/])->[];
normalize_path_list([H | T])-> [H | normalize_path_list(T)].

normalize_path(P) when is_list(P) -> normalize_path_list(P);
normalize_path(P) when is_binary(P) -> list_to_binary(normalize_path_list(binary_to_list(P))).

read(Q)->mnesia:transaction(fun()->qlc:e(Q)end).

start()->
	ok = mnesia:start(),
	mnesia:wait_for_tables([device, pid], 2000).

stop()->mnesia:stop().

create_table()->
	stopped = mnesia:stop(),
	Nodes = [node()],
	%io:format("delete_schema~n"),
	mnesia:delete_schema(Nodes),
	ok = mnesia:create_schema(Nodes),
	ok = mnesia:start(),
	{atomic, ok} = mnesia:create_table(device, [
			 {attributes, record_info(fields, device)}
			,{ram_copies, Nodes}
			,{index, [pid]}
			,{type, bag}
			]),

	{atomic, ok} = mnesia:create_table(pid, [
			 {attributes, record_info(fields, pid)}
			,{ram_copies, Nodes}
			,{index, [device, public_ip]}
			]),
	{atomic, ok} = mnesia:create_table(store, [
			  {attributes, record_info(fields, store)}
			 ,{disc_copies, Nodes}
			 ,{index, [last_modified]}
			 ]),
	start().

save(Key, Value)->mnesia:transaction(fun ()->
		mnesia:write(#store{key=Key, last_modified=os:timestamp(), value=Value})
	end).
load(Key)->read(qlc:q([{V#store.last_modified, V#store.value} || 	V<-mnesia:table(store),
															V#store.key=:=Key])).

delete(Key)->mnesia:transaction(fun()->
		%io:format("delete ~p~n", [Key]),
		case read(qlc:q([D#device.id || D<-mnesia:table(device), D#device.id=:=Key])) of
			{atomic, []}->	mnesia:delete({store, Key});
					   _->  ok
		end
	end).


%-record(device, {id= <<>>, pid= <<>>}).

resolve(ID) when is_list(ID)->mnesia:transaction(fun()->
		lists:flatmap(fun(X)->
			qlc:e(qlc:q([P#device.pid 	|| 	P<-mnesia:table(device),
											P#device.id =:= X]))
		end, ID)
	end);
resolve(ID)->
	read(qlc:q([P#device.pid || P<-mnesia:table(device),
								P#device.id=:=ID])).
	
info(ID)->
	read(qlc:q([{ID, P#pid.device, P#pid.public_ip, P#pid.info} || 	X<-mnesia:table(device),
																	X#device.id=:=ID,
																	P<-mnesia:table(pid),
																	P#pid.id=:=X#device.pid])).

group(Grp, IDs)->
	mnesia:transaction(fun ()->
		Pids = 	lists:flatmap(fun (Hd)->
					qlc:e(qlc:q([Y#device.pid || Y<-mnesia:table(device), Y#device.id =:= Hd]))
				end, IDs),
		case Pids of
			[]->	{fail, <<"no online device">>};
			_ -> 	Set = sets:from_list(Pids),
					lists:foreach(fun (Pid)->
 							mnesia:write(#device{id=Grp, pid=Pid})
 						end, sets:to_list(Set))
		end
	end).

dismiss(Grp)->mnesia:transaction(fun()->
		mnesia:delete({device, Grp})
	end).


join(ID, Pid) when is_list(ID)-> mnesia:transaction(fun ()->
		lists:foreach(fun (Dev)->
				mnesia:write(#device{id=Dev, pid=Pid})
			end, ID)
	end);
join(ID, Pid)->mnesia:transaction(fun ()->
		mnesia:write(#device{id=ID, pid=Pid})
	end).

leave(ID, Pid) when is_list(ID)->mnesia:transaction(fun ()->
		lists:foreach(fun (Dev)->
				mnesia:delete_object(#device{id=Dev, pid=Pid})
			end, ID)
	end);
leave(ID, Pid)->mnesia:transaction(fun ()->
		mnesia:delete_object(#device{id=ID, pid=Pid})
	end).

connect(Pid, Dev, PublicIP)->
		mnesia:transaction(fun () ->
			mnesia:write(#pid{id=Pid, device=Dev, public_ip=PublicIP}),
			mnesia:write(#device{id=Dev, pid=Pid})
		end).
	
connect(Pid, Dev, PublicIP, Info)->
		mnesia:transaction(fun () ->
			mnesia:write(#pid{id=Pid, device=Dev, public_ip=PublicIP, info=Info}),
			mnesia:write(#device{id=Dev, pid=Pid})
		end).


disconnect(Pid)->mnesia:transaction(fun()->
		mnesia:delete({pid, Pid}),
		Devs = qlc:e(qlc:q([ A#device.id || A<-mnesia:table(device), A#device.pid=:=Pid])),
		lists:foreach(fun (ID)->
			mnesia:delete_object(#device{id=ID, pid=Pid})
		end, Devs)
	end).


neibours(IP)->read(qlc:q([ {X#pid.device, X#pid.public_ip, X#pid.info} || X<-mnesia:table(pid),
																		  X#pid.public_ip=:=IP])).



list()-> read(qlc:q([{X#device.id, Y#pid.device, Y#pid.public_ip, Y#pid.info} || X<-mnesia:table(device), 
																				 Y<-mnesia:table(pid),
																				 X#device.pid=:=Y#pid.id])).


%install_screen(Store, Screen)->write(#store{id=Store, screen=Screen}).
%uninstall_screen(Store)->mnesia:transaction(fun()->
%		mnesia:delete({store, Store})
%	end).
%uninstall_screen(Store, Screen)->mnesia:transaction(fun()->
%		mnesia:delete_object(#store{id=Store, screen=Screen})
%	end).

%screen2store(Screen)->read(qlc:q([X#store.id || X<-mnesia:table(store), X#store.screen=:=Screen])).

%store2screen(Store)->read(qlc:q([X#store.screen || X<-mnesia:table(store), X#store.id=:=Store])).

%define_screen(Screen, Device)->write(#screen{id=Screen, device=Device}).

%undef_screen(Screen, Device)->mnesia:transaction(fun()->
%		mnesia:delete_object(#screen{id=Screen, device=Device})
%	end).

%undef_screen(Screen)->mnesia:transaction(fun()->
%		mnesia:delete({screen, Screen})
%	end).

%screen2device(Screen)->read(qlc:q([Y || X<-mnesia:table(screen), 
%										X#screen.id=:=Screen,
%										Y<-mnesia:table(tile),
%										Y#tile.id=:=X#screen.device])).

%device2screen(Device)->read(qlc:q([X#screen.id || X<-mnesia:table(screen), X#screen.device=:=Device])).


%tile_mode(Device, Tile, Row, Column, TileID, NaturalMode)->write(#tile{id=Device, tile=Tile, row=Row, column=Column, tileid=TileID, natural_mode=NaturalMode}).

%tile_mode(Device)->read(qlc:q([X || X<-mnesia:table(tile), X#tile.id=:=Device])).

