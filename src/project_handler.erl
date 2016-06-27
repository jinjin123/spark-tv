-module(project_handler).
-behaviour(cowboy_http_handler).
-export([init/3]).
-export([handle/2]).
-export([terminate/3]).


init(_, Req, _Opts) ->
  	{ok, Req, undefined}.


handle(Req, State) ->
	{ok, Filenames} = file:list_dir_all(code:priv_dir(signage) ++ "/materials/"),
	URLs1 = lists:filter(fun(X)->
		case X of
			[$.|_]->false;
			_->	Ext = lists:nthtail(string:len(X)-4, X),
				Ext =:= ".jpg" orelse Ext =:= ".png" orelse Ext =:= ".svg"
		end
	end, Filenames),
	URLs = lists:map(fun(X)->
		"\"materials/" ++ X ++ "\""
	end, URLs1),
	%io:format("~p~n~p~n~p~n", [Filenames, URLs1, URLs]),
	{ok, Body} = project_dtl:render([{<<"imgs">>, URLs}]),
	{ok, Req2} = cowboy_req:reply(200, [{<<"content-type">>, <<"text/html">>}], Body, Req),
	{ok, Req2, State}.


terminate(_Reason, _Req, _State) ->
  	ok.
