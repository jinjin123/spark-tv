-module(erlang_handler).

-export([init/3]).
-export([handle/2]).
-export([terminate/3]).

init(_Transport, Req, []) ->
	{ok, Req, undefined}.

handle(Req, State) ->
	{Module, Req1} = cowboy_req:binding(module, Req),
	{Func, Req2} = cowboy_req:binding(function, Req1),
	M = binary_to_existing_atom(Module, utf8),
	F = binary_to_existing_atom(Func, utf8),
	{P, Req4} = cowboy_req:qs_val(<<"params">>, Req2),
	Params = case P of
			undefined->[];
			Something->
				io:format("~p~n", [Something]),
				mochijson2:decode(Something)
		end,
	io:format("~p~n", [Params]),
	R = apply(M, F, Params),
	{ok, Req5} = cowboy_req:reply(200, [{<<"content-type">>, <<"application/json">>}
										,{<<"Access-Control-Allow-Origin">>, <<"*">>}
										], mochijson2:encode(R), Req4),
	{ok, Req5, State}.


terminate(_Reason, _Req, _State) ->
	ok.
