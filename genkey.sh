#!/bin/sh
openssl req -x509 -newkey rsa:2048 -keyout priv/ssl/key.pem -out priv/ssl/cert.pem -days 365 -nodes