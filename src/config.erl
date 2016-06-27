-module(config).
-behaviour(gen_server).
-define(CFGNAME, <<"signage.cfg">>).
-export([wshell_url/1, wshell_url/0, stop/0, start_link/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

%-record(config, {wshell_url = <<"ws://localhost:9080/websocket">>, max_client = 100}).
-record(config, {wshell_url = <<"wss://zkf-tsoc.sparkpos.cn:9443/websocket">>, max_client = 100}).

cfg(Cfg)->
	{ok, S} = file:open(?CFGNAME, write),
	io:format(S, "~p.~n", [Cfg]),
	file:close(S).

cfg()->
	case file:read_file_info(?CFGNAME) of
		{ok, _}-> 	{ok, [C | _]} = file:consult(?CFGNAME),
					C;
			 _ -> 	cfg(#config{}),
					#config{}
	end.


start_link()->
	gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

stop()->
	gen_server:cast(?MODULE, stop).

wshell_url(Url) ->
	gen_server:call(?MODULE, {wshell_url, Url}).

wshell_url() ->
	gen_server:call(?MODULE, wshell_url).

init([])->
	{ok, cfg()}.

handle_call({wshell_url, Url}, _From, State)->
	S = State#config{wshell_url=Url},
	{reply, cfg(S), S};
handle_call(wshell_url, _From, State)->
	{reply, State#config.wshell_url, State}.

handle_cast(stop, State)->
	{stop, normal, State}.

handle_info(_, State)->
	{noreply, State}.

terminate(_Reason, _State)->
	ok.

code_change(_OldVsn, State, _Extra)->
	{ok, State}.
