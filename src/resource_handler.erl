-module(resource_handler).
-export([init/3]).
-export([content_types_provided/2, allow_missing_post/2, content_types_accepted/2, allowed_methods/2]).
-export([resource_exists/2, rest_init/2, options/2]).

-export([get_json/2, get_html/2, post_json/2]).

init(_Transport, _Req, Opts) ->
	{upgrade, protocol, cowboy_rest, _Req, Opts}.

rest_init(Req, {Opts, _}) ->
	{ok, Req, Opts}.

allow_missing_post(Req, State)->{true, Req, State}.

options(Req, State) ->
    Req1 = cowboy_req:set_resp_header(<<"access-control-allow-methods">>, <<"GET, OPTIONS, POST, PUT, DELETE, PATCH, HEAD">>, Req),
    Req2 = cowboy_req:set_resp_header(<<"access-control-allow-origin">>, <<"*">>, Req1),
    {ok, Req2, State}.

allowed_methods(Req, State) ->
	{[<<"GET">>, <<"HEAD">>, <<"OPTIONS">>, <<"POST">>, <<"PATCH">>, <<"PUT">>, <<"DELETE">>], Req, State}.

content_types_provided(Req, State) ->
	{[	 {<<"text/html">>, get_html}
		,{<<"application/json">>, get_json}
	], Req, State}.



content_types_accepted(Req, State) ->
	{[	{{<<"application">>, <<"json">>, []}, post_json}
%	   ,{{<<"application">>, <<"x-www-form-urlencoded">>, []}, post_html}
	], Req, State}.

resource_exists(Req, [_H|_]=State) ->
	case cowboy_req:binding(type, Req) of
		{undefined, Req2} ->{false, Req2, State};
		{Type, Req2} ->	{lists:member(Type, State), Req2, State}
	end;
resource_exists(Req, State) ->
	{true, Req, State}.

load_json(Path)->
	case signage:load(Path) of
		{atomic, [{_, V}]}-> mochijson2:encode(V);
						 _-> <<"null">>
	end.

get_html(Req, State)->
	{Pth, Req1} = cowboy_req:path(Req),
	Path = signage:normalize_path(Pth),
	{Type, Req2} = cowboy_req:binding(type, Req1),
	{Id, Req3}   = cowboy_req:binding(id, Req2),
	{Func, Req4} = cowboy_req:binding(function, Req3),
	Bind2list = fun (X)->
		case X of
			undefined->"";
			_->binary_to_list(X)
		end
	end,
	CombineName = fun (X, Y)->
		case X  of
		""->Y;
		_->case Y of
			""->X;
			_->X ++"_"++Y
		   end
		end
	end,
	Module = list_to_existing_atom(CombineName(Bind2list(Type), Bind2list(Func)) ++ "_dtl"),
%	io:format("~n--State:~p~n--Type:~p~n--ID:~p~n--Function:~p~n--Path:~p~n",[State, Type, Id, Func, Path]),
	Json = 	load_json(Path),
	{ok, Body} = case Id of
					undefined->Module:render([{name, Path}, {value, Json}]);
					_->Module:render([{name, Path}, {value, Json}, {id, Id}])
				end,
%	io:format("~n~p~n", [Body]),
	{Body, Req4, State}.

get_json(Req, State)->
	{Pth, Req1} = cowboy_req:path(Req),
	Path = signage:normalize_path(Pth),
	Json = 	load_json(Path),
	Req2 = cowboy_req:set_resp_body(Json, Req1),
	{<<>>, Req2, State}.

post_json(Req, State) -> 
	PPP = fun (M) ->
		case M of
			{<<"POST">>, Req}->{true, Req};
			{<<"PUT">>,  Req}->{true, Req};
			{<<"PATCH">>,Req}->{true,Req};
					{_,  Req}->{false, Req}
		end
	end,
	Method = cowboy_req:method(Req),
	case PPP(Method) of
		{true, Req2} -> 
			{ok, Body, Req3} = cowboy_req:body(Req2),
			Fields = mochijson2:decode(Body),
			{Pth, Req4} = cowboy_req:path(Req3),
			Path = signage:normalize_path(Pth),
			case signage:load(Path) of
				{atomic, []} -> {atomic, ok} = signage:save(Path, Fields),
								wshell:publish(Path, Fields);
				{atomic, [V]}-> case V =:= Fields of
									false->	{atomic, ok} = signage:save(Path, Fields),
											wshell:publish(Path, Fields);
									true -> ok
								end
			end,
			Req5 = cowboy_req:set_resp_body(<<"{\"result\":\"success\"}">>, Req4),
			{true, Req5, State};
		{_, Req2} -> case Method of
					 	{<<"DELETE">>, Req2}->	
							{Pth, Req3} = cowboy_req:path(Req2),
							Path = signage:normalize_path(Pth),	 	
					 		signage:delete(Path),
					 		wshell:publish(Path, <<"null">>),
					 		{true, Req3, State};
					 	_->{true, Req2, State}
					 end
	end.



