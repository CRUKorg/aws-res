# AWS RES for CRUK
This is a project to create a research engineering studio in AWS within CRUK constraints. As we are operating within a shared VPC, some adjustements (aka hacks) are required for both the codebase and the installation instructions. 

## Installation
### Standard Prerequisites
Secrets, as secrets can't be stored as part of the codebase, we would need to manually create the following secrets in the AWS Secrets Manager
* Create `res-ad-service-act-password` secret in Secret Manager and add the following tags
    * `res:EnvironmentName= res-prod`
    * `res:ModuleName= cluster-manager`
* Create RSA Key called `RES-RSA-KEY` and store in Secret Manager

### Networking Customisations
RES requires a private hosted zone to be created in Route53. This is not possible in a shared VPC without additional steps. 

1. create a `temporary VPC` in the account where you are planning to install RES and retreive the VPC ID
2. create a private hosted zone named `<stack-name>.<region>.res` e.g. `res-int.eu-west-2.res` and associate it with the `temporary VPC` and retrieve the hosted zone ID
3. Authenticate your AWS CLI with the credentials of the account where you are planning to install RES
4. Create an association authorization to the `shared VPC` from the CLI
```bash
aws route53 create-vpc-association-authorization --hosted-zone-id <hosted-zone-id> --vpc VPCRegion=<region>,VPCId=<vpc-id> --region eu-west-1
```
5. Authenticate your AWS CLI with the Networking account credentials
6. Associate the hosted zone with the `shared VPC` 
```bash
aws route53 associate-vpc-with-hosted-zone --hosted-zone-id <hosted-zone-id> --vpc VPCRegion=<region>,VPCId=<vpc-id> --region eu-west-1
```
#### Cleanup
7. Authenticate again with the credentials of the account where you are planning to install RES
8. Delete the association authorization as it is not needed anymore
```bash
aws route53 delete-vpc-association-authorization --hosted-zone-id <hosted-zone-id> --vpc VPCRegion=<region>,VPCId=<vpc-id> --region eu-west-1
```
9. Log into route53 console and edit the hosted zone to remove the association with the `temporary VPC`
10. Delete the temporary VPC

### Code customisations
RES installation is done through containers. However, the codebase that is shipped with `RES 2024.08` does attempt to create a private hosted zone and attempst to create other VPC resources that are not allowed in a shared VPC. To work around this, we need to make some changes to the codebase. `cruk/Container` folder has some adjusted files along with a Dockerfile to correctly inject these files into the container. we would need to build and use the modified containers as part of the installation process.

1. log into the AWS account where you are planning to install RES
2. In AWS ECR Create a repository named `research-engineering-studio-edited`
3. While you are logged into the account from the CLI, use the included script to build the container and push it to ECR

```bash
cd cruk/Container
./build-image.sh
```
### Installation
`cruk/ResDeploy` is a CDK project that deploys the standard prerequisites and set CRUK configuration
```bash
cd cruk/ResDeploy
cdk deploy res-prod 
```

## Post Installation
Follow the configuration guidelines in the [RES documentation](https://docs.aws.amazon.com/res/latest/ug/overview.html) to configure the studio.

