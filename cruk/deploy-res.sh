#!/bin/bash

aws cloudformation deploy --template-file ./ResearchAndEngineeringStudio.template.json --stack-name Res-int --parameter-overrides file://parameters.json --s3-bucket cruk-res-backup --s3-prefix template --capabilities CAPABILITY_NAMED_IAM