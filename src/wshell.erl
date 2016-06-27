-module(wshell).
-export([handle/5, send/3, publish/2]).

-include_lib("signage.hrl").

remove_dups([])    -> [];
remove_dups([H|T]) -> [H | [X || X <- remove_dups(T), X /= H]].

send(To, Fields, ForbbidenPid)->
	% make everything in list form	
	Addr0 = case is_list(To) of
				true-> To;
				false->[To]
			end,
	% resolve each dev to pid, count for bad dev id as well
	Addr1 = lists:map(fun (Dev) ->
						{atomic, A} = signage:resolve(Dev),
						case A of
							[_|_]-> {good, A};
							  [] -> {bad, Dev}
						end
					end, Addr0),
	% pick up the good addresses
	Good0 = lists:filtermap(fun (X)->
							case X of
								{good, A} -> {true, A};
								 {bad, _} -> false
							end
						end, Addr1),
	% flatten [[Pid1, Pid2], [Pid3, Pid4], ...] to [Pid1, Pid2, Pid3, Pid4, ...]
	Good1 = lists:flatten(Good0),
	% remove the duplicated Pids
	Good = remove_dups(Good1),
	%dispatch packet except for the sending Pid
	case ForbbidenPid of 
		undefined->lists:foreach(fun (Pid)->
					Pid ! {json, Fields}
				end, Good);
		_->lists:foreach(fun (Pid)->
					case Pid =/= ForbbidenPid of
					true ->	Pid ! {json, Fields};
					false->	ok
					end
				end, Good)
	end,
	% pick up the bad addresses
	Bad0 = lists:filtermap(fun (X)->
							case X of
								 {good, _} -> false;
								{bad, Dev} -> {true, Dev}
							end
						end, Addr1),
	Bad = remove_dups(Bad0),

	case Bad of
		[]->ok;
		_->{error, {cannot_resolve_address, Bad}}
	end.

is_jsonobj([{A, _} | _]) when is_binary(A)->
	true;
is_jsonobj(_)->false.

to_json(X) ->
	case is_jsonobj(X) of
		true   -> 	{struct, [{<<"handler">>, <<"subscription">>}, {<<"data">>, {struct, X}}]};
		false  ->   {struct, [{<<"handler">>, <<"subscription">>}, {<<"data">>, X}]}
	end.

publish(Topic, Fields)->
	%io:format("~nsend to ~p~n", [Topic]),
	%R = 
	send(Topic, [
			 {<<"type">>,	<<"request">>}
			,{<<"from">>,	Topic}
			,{<<"data">>, 	to_json(Fields)}
		], undefined).
	%io:format("~p~n", [R]).

	

json_error_msg(Msg)->
	{struct, [	{<<"message">>, Msg} ]}.

json_error_msg(Msg, Data)->
	{struct, [	{<<"message">>, Msg},
			 	{<<"data">>, Data}	]}.

json_reply(success, empty)->
	{struct, [	{<<"result">>, <<"success">>}]};
json_reply(success, Data)->
	{struct, [	{<<"result">>, <<"success">>}, {<<"data">>, Data}]};
json_reply(error, Data)->
	{struct, [	{<<"result">>, <<"error">>}, {<<"data">>, Data}]}.

is_subscribable(Host, Path) ->
	%new(Socket, Transport, Peer, Method, Path, Query, Version, 
	%Headers, Host, Port, Buffer, CanKeepalive,	Compress, OnResponse)
	Req = cowboy_req:new(socket, http, peer, get, Path, 'query',version, [], Host, no, no, false,false, undefined),
	Opts = ranch:get_protocol_options(http),
	{_, Env} = lists:keyfind(env, 1, Opts),
	case cowboy_router:execute(Req, Env) of 
		{ok, _Req2, [{handler, resource_handler}, {handler_opts, _HandlerOpts}|Env]} ->	true;
		{ok, _Req2, [{handler, collection_handler}, {handler_opts, _HandlerOpts}|Env]} ->	true;
		_ ->false
	end.


handle(wshellsys, <<"reply">>, _Fields, Req, State) -> 
	{noreply, bad, Req, State};
handle(wshellsys, <<"request">>, Fields, Req, State) -> 
	{_, Data} = lists:keyfind(<<"data">>, 1, Fields),
	{struct, Lst} = Data,
	{_, Cmd} = lists:keyfind(<<"command">>, 1, Lst),
	case Cmd of
		<<"ping">> -> {noreply, ok, Req, State};				
		<<"connect">> -> 
			case lists:keyfind(<<"device">>, 1, Lst) of
				{_, ID} ->
					{atomic, Pids} = signage:resolve(ID),
					%io:format("Pids in database: ~p Current Pid:~p~n", [Pids, State#wstate.pid]),
					case Pids of
						[]->{atomic, ok} = case lists:keyfind(<<"info">>, 1, Lst) of
									{_, Info} -> signage:connect(State#wstate.pid, ID, State#wstate.ip, Info);
											_ -> signage:connect(State#wstate.pid, ID, State#wstate.ip)
								end,
							{reply, json_reply(success, {struct, [{<<"timeout">>, ?TIMEOUT - 30000}]}), Req, State};
						X ->io:format("~p is alread connected by ~p~n", [ID, X]),
							{shutdown, Req, State} %the ID is connected already
					end;
				_ -> {reply, json_reply(error, json_error_msg(<<"missing argument \"device\"">>)), Req, State}
			end;
		<<"disconnect">> ->
			%don't delete database record here, the real action happens at ws_handler:terminate
			{shutdown, Req, State};
		<<"info">> ->
			case lists:keyfind(<<"device">>, 1, Lst) of
				{_, ID} ->	{atomic, Devs} = signage:info(ID),
					case Devs of
						[]-> {reply, json_reply(error, json_error_msg(<<"bad argument \"device\"">>)), Req, State};
						_ -> Fmt = lists:map(fun ({Gid, Dev, PubIP, Info})->
								   				{struct , [	{<<"id">>, Gid},
								   							{<<"device">>, Dev},
								   							{<<"public_ip">>, PubIP},
								   							{<<"info">>, Info}]}
						   					end, Devs),
								{reply, json_reply(success, Fmt), Req, State}
					end;
					  _ ->	{reply, json_reply(error, json_error_msg(<<"missing argument \"device\"">>)), Req, State}
			end;
		<<"list">> ->
			{atomic, Devs} = signage:list(),
			Fmt = lists:map(fun ({ID, Dev, PubIP, Info})->
						{struct, [	{<<"id">>, ID},
									{<<"device">>, Dev},
									{<<"public_ip">>, PubIP},
									{<<"info">>, Info}]} 	
					end, Devs),
			{reply, json_reply(success, Fmt), Req, State};
		<<"neibours">> ->
			{atomic, NLst} = signage:neibours(State#wstate.ip),
			Fmt = lists:map(fun ({Dev, PubIP, Info}) -> 
					{struct, [	{<<"device">>, Dev},
								{<<"public_ip">>, PubIP},
								{<<"info">>, Info}]} 
				end, NLst),
			{reply, json_reply(success, Fmt), Req, State};
		<<"subscribe">>->
			case lists:keyfind(<<"topic">>, 1, Lst) of
				{_, Tpc} -> Topic = signage:normalize_path(Tpc),
							Host= cowboy_req:get(host, Req),	
							case is_subscribable(Host, Topic) of 
								true->	{atomic, ok} = signage:join(Topic, State#wstate.pid),
										case signage:load(Topic) of 
											{atomic, [{_, V}]} -> 	%io:format("subscribe success with data ~p~n", [V]),
																	{reply, json_reply(success, V), Req, State};
															 _U -> 	%io:format("subscribe success without data ~p~n", [_U]),
															 		{reply, json_reply(success, empty), Req, State}
										end;
								false->{reply, json_reply(error, json_error_msg(<<"topic is not subscribable">>)), Req, State}
							end;
				   		_ ->{reply, json_reply(error, json_error_msg(<<"missing argument \"topic\"">>)), Req, State}
			end;
		<<"unsubscribe">>->
			case lists:keyfind(<<"topic">>, 1, Lst) of
				{_, Tpc} ->	Topic = signage:normalize_path(Tpc),	
							{atomic, ok} = signage:leave(Topic, State#wstate.pid),
							{reply, json_reply(success, empty), Req, State};
				       _ -> {reply, json_reply(error, json_error_msg(<<"missing argument \"topic\"">>)), Req, State}
			end;
		<<"kill">> -> 
			case lists:keyfind(<<"device">>, 1, Lst) of
				{_, ID} ->
					{atomic, Pids} = signage:resolve(ID),
					case Pids of
						[]->{reply, json_reply(success, empty), Req, State};
						_ ->lists:foreach(fun (X)->
								X ! shutdown
							end, Pids),
							{reply, json_reply(success, empty), Req, State}
					end;
				_ -> {reply, json_reply(error, json_error_msg(<<"missing argument \"device\"">>)), Req, State}
			end;			
		<<"join">> ->
			case lists:keyfind(<<"device">>, 1, Lst) of
				{_, Dev} ->	{atomic, ok} = signage:join(Dev, State#wstate.pid),
							%io:format("join(~p,~p)~n",[Dev, State#wstate.pid]),
							{reply, json_reply(success, empty), Req, State};
				       _ -> {reply, json_reply(error, json_error_msg(<<"missing argument \"device\"">>)), Req, State}
			end;
		<<"leave">> ->
			case lists:keyfind(<<"device">>, 1, Lst) of
				{_, Dev} ->	{atomic, ok} = signage:leave(Dev, State#wstate.pid),
							%io:format("leave(~p,~p)~n",[Dev, State#wstate.pid]),
							{reply, json_reply(success, empty), Req, State};
				_ -> {reply, json_reply(error, json_error_msg(<<"missing argument \"device\"">>)), Req, State}
			end;							
		<<"group">> ->
			case lists:keyfind(<<"group">>, 1, Lst) of
				{_, Grp} ->	case lists:keyfind(<<"device">>, 1, Lst) of
								{_, Dev} ->	case signage:group(Grp, Dev) of
													 {atomic, ok} -> {reply, json_reply(success, empty), Req, State};
											{atomic, {fail, Why}} -> {reply, json_reply(error, json_error_msg(Why)), Req , State}
											end;
								_ -> {reply, json_reply(error, json_error_msg(<<"missing argument \"device\"">>)), Req, State}
							end;							
				_ -> {reply, json_reply(error, json_error_msg(<<"missing argument \"group\"">>)), Req, State}
			end;
		<<"dismiss">> ->
			case lists:keyfind(<<"group">>, 1, Lst) of
				{_, Grp} ->	{atomic, ok} = signage:dismiss(Grp),
							{reply, json_reply(success, empty), Req, State};
				_ -> {reply, json_reply(error, json_error_msg(<<"missing argument \"group\"">>)), Req, State}
			end;
		_Cmd -> 
			{reply, json_reply(error, json_error_msg(<<"unknown command ", Cmd/binary>>)), Req, State}
	end;
handle(route, To, Fields, Req, State) -> 
	case send(To, Fields, State#wstate.pid) of
		{error, {cannot_resolve_address, Bad}}->{reply, json_reply(error , json_error_msg(<<"cannot resolve address">>, Bad)), Req, State};
		_->{noreply, ok, Req, State}
	end.


