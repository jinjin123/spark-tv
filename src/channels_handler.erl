-module(channels_handler).
-export([init/3]).
-export([content_types_provided/2, allow_missing_post/2, allowed_methods/2]).
-export([resource_exists/2, rest_init/2, options/2]).

-export([get_json/2, get_html/2]).

init(_Transport, Req, Opts) ->
	{upgrade, protocol, cowboy_rest, Req, Opts}.

rest_init(Req, Opts) ->
	{ok, Req, Opts}.

allow_missing_post(Req, State)->{false, Req, State}.

options(Req, State) ->
    Req1 = cowboy_req:set_resp_header(<<"access-control-allow-methods">>, <<"GET, OPTIONS, HEAD">>, Req),
    Req2 = cowboy_req:set_resp_header(<<"access-control-allow-origin">>, <<"*">>, Req1),
    {ok, Req2, State}.

allowed_methods(Req, State) ->
	{[<<"GET">>, <<"HEAD">>, <<"OPTIONS">>], Req, State}.

content_types_provided(Req, State) ->
	{[	 {<<"text/html">>, get_html}
		,{<<"application/json">>, get_json}
	], Req, State}.


resource_exists(Req, State) ->
	{true, Req, State}.

channels()->
	{ok, Filenames} = file:list_dir_all(code:priv_dir(signage) ++ "/channels/"),
	URLs = lists:filter(fun(X)->
		case X of
			[$.|_]->false;
			_->	filelib:is_dir(code:priv_dir(signage) ++ "/channels/" ++ X) andalso
				filelib:is_file(code:priv_dir(signage) ++ "/channels/" ++ X ++ "/index.html")
		end
	end, Filenames),
	lists:map(fun(X)->
		"channels/" ++ X ++ "/index.html"
	end, URLs).

get_html(Req, State)->
	URLs = channels(),
	Req1 = cowboy_req:set_resp_header(<<"access-control-allow-origin">>, <<"*">>, Req),
	{ok, Body} = channels_html_dtl:render([{urls, URLs}]),
	{Body, Req1, State}.

get_json(Req, State)->
	URLs = channels(),
	Req1 = cowboy_req:set_resp_header(<<"access-control-allow-origin">>, <<"*">>, Req),
	{ok, Body} = channels_json_dtl:render([{urls, URLs}]),
	{Body, Req1, State}.


