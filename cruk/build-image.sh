#!/bin/bash
RES_VERSION=2024.08-d09c2666
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin 202435887288.dkr.ecr.eu-west-2.amazonaws.com
docker build . --build-arg RES_VERSION=${RES_VERSION} \
-t 202435887288.dkr.ecr.eu-west-2.amazonaws.com/research-engineering-studio-edited:latest \
-t 202435887288.dkr.ecr.eu-west-2.amazonaws.com/research-engineering-studio-edited:${RES_VERSION}
docker push 202435887288.dkr.ecr.eu-west-2.amazonaws.com/research-engineering-studio-edited --all-tags