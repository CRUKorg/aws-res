#!/bin/bash
RES_VERSION=2024.10-bb8c2292
AWS_REGION=eu-west-2
ECR_REPO="$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com"
# echo "ECR_REPO: ${ECR_REPO}"
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin ${ECR_REPO}
docker build . --build-arg RES_VERSION=${RES_VERSION} \
-t ${ECR_REPO}/research-engineering-studio-edited:latest \
-t ${ECR_REPO}/research-engineering-studio-edited:${RES_VERSION}
docker push ${ECR_REPO}/research-engineering-studio-edited --all-tags