#!/bin/sh

make clean
make
cd _rel
tar -cf x.tar signage_release/
scp x.tar root@zkf-tsoc.sparkpos.cn:/root
ssh root@zkf-tsoc.sparkpos.cn
#scp zkfpos_release.tar ubuntu@182.254.213.64:/home/ubuntu

