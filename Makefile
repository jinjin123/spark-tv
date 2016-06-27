PROJECT = signage
DEPS = cowboy erlydtl eunit eunit_formatters
include erlang.mk

e:all
	_rel/signage_release/bin/signage_release console
