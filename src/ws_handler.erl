-module(ws_handler).
-behaviour(cowboy_websocket_handler).
-include_lib("signage.hrl").
-export([init/3]).
-export([websocket_init/3]).
-export([websocket_handle/3]).
-export([websocket_info/3]).
-export([websocket_terminate/3]).


init(_Conn, _Req, _Opts) ->
	{upgrade, protocol, cowboy_websocket}.

websocket_init(_TransportName, Req, _Opts) ->
	{{PeerIP, _Port}, _} = cowboy_req:peer(Req),
	IP = list_to_binary(io_lib:format("~p.~p.~p.~p", tuple_to_list(PeerIP))),
	{ok, Req, #wstate{pid=self(),ip=IP} , ?TIMEOUT}.

websocket_handle({text, Msg}, Req, State) ->
	{struct, Fields} = mochijson2:decode(Msg),
	case 	case lists:keyfind(<<"to">>, 1, Fields) of
				{_, To} ->	wshell:handle(route, To, Fields, Req, State);
					  _ ->	{_, Type} = lists:keyfind(<<"type">>, 1, Fields),
							wshell:handle(wshellsys, Type, Fields, Req, State)
			end of
		{reply, Result, Req2, State2} ->
			case lists:keyfind(<<"id">>, 1, Fields) of
				{_, Id} ->	Json = mochijson2:encode({struct, [	{<<"type">>, <<"reply">>}, 
																{<<"id">>, Id},
																{<<"data">>, Result}]}),
							{reply, {text, Json}, Req2, State2};
					  _ ->	Json = mochijson2:encode({struct, [	{<<"type">>, <<"reply">>},
						 										{<<"data">>, Result}]}),
							{reply, {text, Json}, Req2, State2}
			end;
		{shutdown, Req2, State2}	 ->
			%io:format("Close Connection from Server Side~n"),
			{shutdown, Req2, State2};
		{_, _, Req2, State2} 		 ->	
			{ok, Req2, State2}
	end;
websocket_handle(_Data, Req, State) ->
	{ok, Req, State}.

websocket_info(shutdown, Req, State)->
	%io:format("Close Connection from Server Side~n"),
	{shutdown, Req, State};
websocket_info({text, Msg}, Req, State) ->
	{reply, {text, Msg}, Req, State};
websocket_info({json, Fields}, Req, State) ->
	{reply, {text, mochijson2:encode({struct, Fields})}, Req, State};
websocket_info(_Info, Req, State) ->
	{ok, Req, State}.

websocket_terminate(_Reason, _Req, #wstate{pid=Pid}) ->
	signage:disconnect(Pid),
	ok.
