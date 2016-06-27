-module(wshell_handler).
-export([init/3]).
-export([content_types_provided/2, allow_missing_post/2, content_types_accepted/2, allowed_methods/2]).
-export([rest_init/2, options/2]).

-export([rest_terminate/2, terminate/3, get_json/2, post_json/2, post_html/2]).

init(_Transport, _Req, _Opts) ->
	{upgrade, protocol, cowboy_rest}.

rest_init(Req, Opts) ->
	{ok, Req, Opts}.

rest_terminate(_Req, _Opts)->
	signage:disconnect(self()),
	ok.

allow_missing_post(Req, State)->{true, Req, State}.

options(Req, State) ->
    Req1 = cowboy_req:set_resp_header(<<"access-control-allow-methods">>, <<"GET, POST">>, Req),
    Req2 = cowboy_req:set_resp_header(<<"Access-Control-Allow-Origin">>, <<"*">>, Req1),
    {ok, Req2, State}.

allowed_methods(Req, State) ->
	{[<<"GET">>, <<"POST">>], Req, State}.

content_types_provided(Req, State) ->
	{[	 {<<"application/json">>, get_json}
	], Req, State}.



content_types_accepted(Req, State) ->
	{[	{{<<"application">>, <<"json">>, []}, post_json}
	   ,{{<<"application">>, <<"x-www-form-urlencoded">>, []}, post_html}
	], Req, State}.



eval({struct, Fields})->
	{struct, lists:map(fun({Key, Value})->
		%io:format("eval(~p)~n",[Value]),
		{Key, eval(Value)}
	end, Fields)};	
eval(X) when is_binary(X)->
	%io:format("decode(~p)~n",[X]),
	try
		mochijson2:decode(X)
	catch
	_:_->	%io:format("get exception~n"),
			X
	end;	
eval(X) when is_list(X)->
	%io:format("decode(~p)~n",[X]),
	try
		mochijson2:decode(X)
	catch
		_:_->lists:map(fun(Y)->
				eval(Y)
			end, X)
	end;
eval(X)->X.


construct(Data, To, From)->
	Data0 = eval({struct, Data}),
	Data1 = {struct, [
		 {<<"handler">>, <<"command">>}
		,{<<"data">>, Data0}
	]},
	[
		 {<<"type">>,<<"request">>}
		,{<<"from">>, <<From/binary>>}
		,{<<"to">>, To}
		,{<<"data">>, Data1}
	].
forward(Fields, Req)->
	case lists:keyfind(<<"to">>, 1, Fields) of
		{_, To} ->	Name = list_to_binary(pid_to_list(self())),
					{{PeerIP, _}, _} = cowboy_req:peer(Req),
					IP = list_to_binary(io_lib:format("~p.~p.~p.~p", tuple_to_list(PeerIP))),
					signage:connect(self(), Name, IP),
					Fs = construct(proplists:delete(<<"to">>, Fields), To, Name),
					case wshell:send(To, Fs, undefined) of
					{error, {cannot_resolve_address, Bad}}->
						X = {struct, [	{<<"result">>, <<"error">>},
										{<<"message">>, <<"cannot resolve address">>}, 
										{<<"data">>, Bad}]},
						{error, X};
					_-> ok
					end;
			  _ ->  X = {struct, [	{<<"result">>, <<"error">>},
									{<<"message">>, <<"missing argument 'to'">>}]},
			  		{error, X}
	end.

feedback(Req, State)->
	receive
		{json, Msg}->	case lists:keyfind(<<"data">>, 1, Msg) of
						{_, D} -> {mochijson2:encode(D), Req, State};
							 _ -> {mochijson2:encode({struct, Msg}), Req, State}
						end
	after 60000->
			{mochijson2:encode({struct, [{<<"result">>, null},{<<"error">>,<<"timeout">>}]}), Req, State}
	end.


get_json(Req, State)->
	Req0 = cowboy_req:set_resp_header(<<"Access-Control-Allow-Origin">>, <<"*">>, Req),
	{Fields, Req1} = cowboy_req:qs_vals(Req0),
	%io:format("~p~n", [Fields]),
	case  forward(Fields, Req1) of
			  ok->	feedback(Req1, State);
	{error, Msg}->	%io:format("forward error ~p~n", [Msg]),
					Json = mochijson2:encode(Msg),
					{Json, Req1, State}
	end.

post_html(Req, State)->
	Req0 = cowboy_req:set_resp_header(<<"Access-Control-Allow-Origin">>, <<"*">>, Req),
	{ok, Fields, Req1} = cowboy_req:body_qs(Req0),
	case  forward(Fields, Req1) of
			  ok->	feedback(Req1, State);
	{error, Msg}->	{mochijson2:encode(Msg), Req1, State}
	end.


post_json(Req, State) -> 
	Req0 = cowboy_req:set_resp_header(<<"Access-Control-Allow-Origin">>, <<"*">>, Req),
	{ok, Body, Req1} = cowboy_req:body(Req0),
	{struct, Fields} = mochijson2:decode(Body),
	case  forward(Fields, Req1) of
			  ok->	feedback(Req1, State);
	{error, Msg}->	{mochijson2:encode(Msg), Req1, State}
	end.

terminate(_Reason, _Req, _State) ->
	ok.