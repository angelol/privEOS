#!/bin/sh
if [ -f ./local-config.json ]; 
    then echo "./local-config.json";
    else echo "./config.json"; 
fi