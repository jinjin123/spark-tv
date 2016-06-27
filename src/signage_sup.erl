-module(signage_sup).
-behaviour(supervisor).

-export([start_link/0]).
-export([init/1]).

-spec start_link() -> {ok, pid()}.
start_link() ->
	supervisor:start_link({local, ?MODULE}, ?MODULE, []).


init([]) ->
	Procs = [{	
				config,	
				{	
					config,
					start_link,
					[]	
				},	
				permanent,	
				2000,	
				worker,		
				[config]	
			},{
				sync,
				{
					sync,
					start_link,
					[]
				},
				permanent,
				2000,
				worker,
				[sync]
			}],
	{ok, {{one_for_one, 10, 10}, Procs}}.
