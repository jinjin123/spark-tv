-module(sync_handler).
-behaviour(cowboy_websocket_handler).
-export([init/3]).
-export([websocket_init/3]).
-export([websocket_handle/3]).
-export([websocket_info/3]).
-export([websocket_terminate/3]).



	
init(_Conn, _Req, _Opts) ->
	{upgrade, protocol, cowboy_websocket}.

websocket_init(_TransportName, Req, _Opts) ->
	{ok, Req, _Opts , 1 * 60 * 1000}.

websocket_handle({text, Msg}, Req, State) ->
	{struct, Fields} = mochijson2:decode(Msg),
	case  lists:keyfind(<<"command">>, 1, Fields) of
		{_, <<"start">>}->case lists:keyfind(<<"peers">>, 1, Fields) of
							{_, Peers}->sync:start(Peers),
										{ok, Req, State};
							_->{reply, {text, "\"{result:null,error:\"missing argument peers\"}\""}, Req, State}
						  end;
	 	{_, <<"register">>}->case lists:keyfind(<<"peer">>, 1, Fields) of
	 							{_, Peer}->sync:register(Peer),
	 										{ok, Req, State};
	 							_->{reply, {text, "\"{result:null,error:\"missing argument peer\"}\""}, Req, State}
	 						 end;
	 	{_, <<"end">>}->sync:stop(),
	 					{shutdown, Req, State}
	end;
websocket_handle(_Data, Req, State) ->
	{ok, Req, State}.

websocket_info(shutdown, Req, State)->
	io:format("Close Connection from Server Side~n"),
	{shutdown, Req, State};
websocket_info({text, Msg}, Req, State) ->
	io:format("send ~p~n", [Msg]),
	{reply, {text, Msg}, Req, State};
websocket_info({json, Fields}, Req, State) ->
	{reply, {text, mochijson2:encode({struct, Fields})}, Req, State};
websocket_info(_Info, Req, State) ->
	{ok, Req, State}.

websocket_terminate(_Reason, _Req, _State) ->
	ok.
