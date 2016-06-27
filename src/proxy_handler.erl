-module(proxy_handler).
-behaviour(cowboy_http_handler).
-export([init/3]).
-export([handle/2]).
-export([terminate/3]).


init(_, Req, _Opts) ->
  	{ok, Req, undefined}.


handle(Req, State) ->
	{URL, Req1} = cowboy_req:qs_val(<<"url">>, Req),
	{_H, Req2} = cowboy_req:headers(Req1),
%	Headers = lists:map(fun({N,V})->
%		{binary_to_list(N), binary_to_list(V)}
%	end, H),
%	io:format("~nGET ~p~n", [URL]),
%	io:format("~p~n", [Headers]),
%	{ok, {{_,HttpCode,_}, HttpHeader, Body}} = httpc:request(get, {binary_to_list(URL), Headers}, [], []),
	{ok, {{_,HttpCode,_}, HttpHeader, Body}} = httpc:request(binary_to_list(URL)),
	{ok, Req3} = cowboy_req:reply(HttpCode, HttpHeader, Body, Req2),
	{ok, Req3, State}.


terminate(_Reason, _Req, _State) ->
  	ok.
