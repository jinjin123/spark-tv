-module(syncdtl_handler).
-behaviour(cowboy_http_handler).
-export([init/3]).
-export([handle/2]).
-export([terminate/3]).


init(_, Req, _Opts) ->
  	{ok, Req, undefined}.



handle(Req, State) ->
	{IP, Req1} = cowboy_req:binding(ip, Req),
	{Fields, Req2} = cowboy_req:qs_vals(Req1),
	Files = case lists:keyfind(<<"peers">>, 1, Fields) of
			false-><<"[[\"assets/1.mp4\",\"assets/2.mp4\",\"assets/3.mp4\",\"assets/4.mp4\",\"assets/5.mp4\"]]">>;
			{_, V}->V
		end,
	Arg = [{peers, Files}, {ip, <<"ws://", IP/binary, ":9080/syncsckt">>}],
	%io:format("~p~n", [Arg]),
	{ok, Body} = sync_dtl:render(Arg),
	{ok, Req3} = cowboy_req:reply(200, [{<<"content-type">>, <<"text/html">>}], Body, Req2),
	{ok, Req3, State}.


terminate(_Reason, _Req, _State) ->
  	ok.
