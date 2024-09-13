#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ResBaseStack } from '../lib/res_base-stack';
import { ResStack } from '../lib/res';

const app = new cdk.App();

const prodEnv = {
  envName: 'prod',
  env: { account: '277707094382', region: 'eu-west-2' }
}

//base stack
const resBaseProd = new ResBaseStack(app, 'ResBaseStackProd', {
  baseDomain: 'compute.app.crnet.org',
  vpcId: 'vpc-09d085203fb33443c',
  ...prodEnv
});

//application stack
new ResStack(app, 'Res-prod', {  parameters: resBaseProd.parameterExports, ...prodEnv });