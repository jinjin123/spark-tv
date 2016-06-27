-module(dtl_handler).
-behaviour(cowboy_http_handler).
-export([init/3]).
-export([handle/2]).
-export([terminate/3]).


init(_, Req, _Opts) ->
  	{ok, Req, undefined}.


handle(Req, State) ->
	{Path, Req1} = cowboy_req:path(Req),
	[_|P] = binary_to_list(Path),
	Module = list_to_existing_atom(P++"_dtl"),
	{Prop, Req2} = cowboy_req:qs_vals(Req1),
	Arg = lists:map(fun(X)->
		case X of
			{N,V} ->{binary_to_existing_atom(N, utf8), V}
		end
	end, Prop),
	{ok, Body} = Module:render(Arg),
	{ok, Req3} = cowboy_req:reply(200, [{<<"content-type">>, <<"text/html">>}], Body, Req2),
	{ok, Req3, State}.


terminate(_Reason, _Req, _State) ->
  	ok.
