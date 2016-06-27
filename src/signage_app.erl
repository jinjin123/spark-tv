-module(signage_app).
-behaviour(application).
-export([start/2]).
-export([stop/1]).

start(_Type, _Args) ->
	case signage:start() of
		{timeout, _}->signage:create_table();
		_ -> ok
	end,
	timer:start(),
	Dispatch = cowboy_router:compile([
		{'_', [
			 {"/js/[...]", cowboy_static, {priv_dir, signage, "js"}}
			,{"/css/[...]", cowboy_static, {priv_dir, signage, "css"}}
			,{"/assets/[...]", cowboy_static, {priv_dir, signage, "assets"}}
			,{"/channels", channels_handler, []}			
			,{"/channels/[...]", cowboy_static, {priv_dir, signage, "channels"}}
			,{"/materials/[...]", cowboy_static, {priv_dir, signage, "materials"}}
			,{"/websocket", ws_handler, []}
			,{"/syncsckt", sync_handler, []}
			,{"/sync/:ip", syncdtl_handler, []}
			,{"/wshell", wshell_handler, []}
			,{"/upload", upload_handler, []}
			,{"/proxy", proxy_handler, []}
			,{"/device", dtl_handler, []}
			,{"/project", project_handler, []}
			,{"/erlang/:module/:function/[:parity]", erlang_handler, []}
			,{"/:type/:id/:function", resource_handler, {[<<"device">>], [device_dtl,device_preview_dtl,device_shell_dtl,device_scap_dtl,device_config_dtl, device_debug_dtl]}}
			,{"/", cowboy_static, {priv_file, signage, "index.html"}}
			,{"/[...]", cowboy_static, {priv_dir, signage, ""}}
%			,{"/device/:id/preview", preview_handler, []}
%			,{"/device/:id/config", subscribable_handler, []}
%			,{"/device/:id/shell", shell_handler, []}
%			,{"/device/:id/scap", scap_handler, []}
		]}
	]),

	{ok, _} = cowboy:start_http(http, 100, [{port, 9080}], [{env, [{dispatch, Dispatch}]}]),
    {ok, _} = cowboy:start_https(https, 100, [{port, 9443},
                                              {certfile, code:priv_dir(signage) ++ "/ssl/cert.pem"},
                                              {keyfile,  code:priv_dir(signage) ++ "/ssl/key.pem"}],
                                 [{env, [{dispatch, Dispatch}]}]),

	signage_sup:start_link().

stop(_State) ->
	ok.

