#!/usr/bin/env bash

cd "$(dirname "$0")"
cd ../..
mkdir -p ./tmp/maxmind
cd ./tmp/maxmind

condition=$(which wget 2>/dev/null | grep -v "not found" | wc -l)
if [ $condition -eq 0 ] ; then
    echo "wget is not installed"
    exit 1
fi

wget http://geolite.maxmind.com/download/geoip/database/GeoLiteCity.dat.gz
gunzip GeoLiteCity.dat.gz -f
