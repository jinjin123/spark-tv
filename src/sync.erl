-module(sync).
-behaviour(gen_server).
-record(sync_state, {peers, pids, timer_ref}).
-export([start/1, register/1, stop/0, start_link/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).
-define(INTERVAL, 5000).

start(Peers)->
	gen_server:cast(?MODULE, {start, Peers}).

register(Peer)->
	gen_server:cast(?MODULE, {register, self(), Peer}).


start_link()->
	gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

stop()->
	gen_server:cast(?MODULE, stop).

reset()->#sync_state{peers=[], pids=[], timer_ref=0}.

reset(State)->
	Ref = State#sync_state.timer_ref,
	timer:cancel(Ref),
	reset().

broadcast(_Msg, [])->ok;
broadcast(Msg, [Pid | Tail])->
	Pid ! Msg,
	broadcast(Msg, Tail).

init([]) ->
	{ok, reset()}.


handle_call(_, _, S)->{reply, ok, S}.

handle_cast({start, Peers}, State)->
	%io:format("handle_cast:~p~n", [{start, Peers}]),
	reset(State),
	{noreply, #sync_state{pids=[], peers=Peers}};
handle_cast({register, From, Peer}, State)->
	%io:format("handle_cast:~p~n", [{register, From, Peer}]),
	#sync_state{pids=Pids, peers=Peers} = State,
	NewPids = case lists:member(Peer, Peers) of
		true->[From | Pids];
		_->Pids
	end,
	NewPeers = lists:delete(Peer, Peers),
	case NewPeers of
		[]->broadcast({text, <<"{\"seek\":0}">>}, NewPids),
			case timer:send_after(?INTERVAL, {timeout, ?INTERVAL}) of
				{ok, Ref}->{noreply, State#sync_state{pids=NewPids, peers=NewPeers, timer_ref=Ref}};
				_->{noreply, State#sync_state{pids=NewPids, peers=NewPeers}}
			end;
		_->{noreply, State#sync_state{pids=NewPids, peers=NewPeers}}
	end;
handle_cast(stop, State)->
	%io:format("handle_cast:~p~n", [stop]),
	{noreply, reset(State)}.

handle_info({timeout, _Time}, State)->
	%io:format("handle_info:~p~n", [{timeout, Time}]),
	%Msg = list_to_binary(io_lib:format("{\"seek\":~p}",[Time])),
	%broadcast({text, Msg}, State#sync_state.pids),
	%case timer:send_after(?INTERVAL, {timeout, Time + ?INTERVAL}) of
	%	{ok, Ref}->{noreply, State#sync_state{timer_ref=Ref}};
	%	_->{noreply, State#sync_state{timer_ref=0}}
	%end;
	{noreply, State#sync_state{timer_ref=0}};

handle_info(_Info, State)->
	%io:format("handle_info:~p~n", [_Info]),
	{noreply, State}.

terminate(_Reason, _State)->
	%io:format("terminate~n"),
	ok.

code_change(_OldVsn, State, _Extra)->
	{ok, State}.



                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              