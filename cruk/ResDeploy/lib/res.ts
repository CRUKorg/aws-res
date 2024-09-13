import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface ResProps extends cdk.StackProps {
    envName: string;
    parameters: { [parameterName: string]: any };
}


export class ResStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ResProps) {
        super(scope, id, props);

   
        const res = new cdk.cloudformation_include.CfnInclude(this, `RES-${props.envName}`, {
            templateFile: 'lib/resources/ResearchAndEngineeringStudio.template.json',
            parameters: props.parameters
        })


    }

}
