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

const intEnv = {
  envName: 'int',
  env: { account: '202435887288', region: 'eu-west-2' }
}


//base stacks
const resBaseProd = new ResBaseStack(app, 'ResBaseStackProd', {
  baseDomain: 'compute.app.crnet.org',
  vpcId: 'vpc-09d085203fb33443c',
  ...prodEnv
});
const resBaseInt = new ResBaseStack(app, 'ResBaseStackInt', {
  baseDomain: 'int.compute.app.crnet.org',
  vpcId: 'vpc-05a956a3e89cc14ce',
  ...intEnv
});

//application stack
new ResStack(app, 'Res-prod', { parameters: resBaseProd.parameterExports, ...prodEnv });
new ResStack(app, 'Res-int', { parameters: resBaseInt.parameterExports, ...intEnv });
 