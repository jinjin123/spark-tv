
-module(upload_handler).
-behaviour(cowboy_http_handler).
-export([init/3, handle/2, terminate/3]).

init({_Transport, http}, Req, []) ->
	{ok, Req, {}}.



handle(Req, State) ->
	{_Result, Req2} = acc_multipart(Req, []),
	%io:format( "Result= ~p~n", [_Result] ),
	{ok, Req3} = cowboy_req:reply(200, [
		{<<"content-type">>, <<"text/plain; charset=UTF-8">>}
	], <<"OK">>, Req2),
	{ok, Req3, State}.

terminate(_Reason, _Req, _State) ->
	ok.


md5_hex(S) ->
       lists:flatmap(fun(X) -> int_to_hex(X) end, binary_to_list(S)).

int_to_hex(N) when N < 256 ->
       [hex(N div 16), hex(N rem 16)].

hex(N) when N < 10 ->
       $0+N;
hex(N) when N >= 10, N < 16 ->
       $A + (N-10).

clear_dir(Fn)->
	Prefix = code:priv_dir(signage) ++ "/materials/",
	{ok, Filenames} = file:list_dir_all(Prefix),
	{ok, MP} = re:compile(Fn),
	lists:foreach(fun(X)->
		case re:run(X, MP) of
			{match, [{0,_}]}->file:delete(Prefix ++ X);	
			_->ok
		end
	end, Filenames).

acc_multipart(Req, Acc) ->
	case cowboy_req:part(Req) of
		{ok, Headers, Req2} ->
			[Req4, Body] = case cow_multipart:form_data(Headers) of
				{data, _FieldName} ->
					{ok, MyBody, Req3} = cowboy_req:part_body(Req2),
					[Req3, MyBody];
				{file, _FieldName, Filename, _CType, _CTransferEncoding} ->
					%io:format("stream_file filename=~p content_type=~p~n", [Filename, CType]),
					clear_dir(Filename),
					Fn =  code:priv_dir(signage) ++ "/materials/" ++ binary_to_list(Filename),
					Ext = filename:extension(Fn),
					{ok, IoDevice} = file:open(Fn ++ ".tmp", [raw, write, binary]),
					{Req5, MD5}=stream_file(Req2, IoDevice, erlang:md5_init()),
					file:close(IoDevice),
					NewFn = Fn ++ "." ++ md5_hex(erlang:md5_final(MD5)) ++ Ext,
					X = file:rename(Fn ++ ".tmp", NewFn),
					io:format("~p => ~p : ~p~n", [Fn++".tmp", NewFn, X]),
					[Req5, <<"skip printing file content">>]
				end,
			acc_multipart(Req4, [{Headers, Body}|Acc]);
		{done, Req2} ->
			{lists:reverse(Acc), Req2}
	end.

stream_file(Req, IoDevice, MD5) ->
	case cowboy_req:part_body(Req) of
		{ok, Body, Req2} ->
			file:write(IoDevice, Body),
			MD51=erlang:md5_update(MD5, Body),
			{Req2, MD51};
		{more, Body, Req2} ->
			file:write(IoDevice, Body),
			MD51=erlang:md5_update(MD5, Body),
			stream_file(Req2, IoDevice, MD51)
	end.

