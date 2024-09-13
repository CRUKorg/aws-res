import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Certbot, CertificateStorageType } from "@renovosolutions/cdk-library-certbot";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Parameter } from "aws-cdk-lib/aws-appconfig";
import { createPrivateKey } from "crypto";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface ResProps extends cdk.StackProps {
    baseDomain: string;
    vpcId: string;
    envName: string;
}
export class ResBaseStack extends cdk.Stack {
    public parameterExports: { [parameterName: string]: any } = {}; 
    constructor(scope: Construct, id: string, props: ResProps) {
        super(scope, id, props);

        const adminEmail = "ammar.rahman@cancer.org.uk";
        //certificate for VDI
        const letsencryptSecretPath = `${props.envName}/vdi/cert`;
        new Certbot(this, "VDICert", {
            letsencryptDomains: `vdi.${props.baseDomain},*.vdi.${props.baseDomain}`,
            letsencryptEmail: "ammar.rahman@cancer.org.uk",
            hostedZoneNames: [`${props.baseDomain}`],
            certificateStorage: CertificateStorageType.SECRETS_MANAGER,
            secretsManagerPath: letsencryptSecretPath,
        });

        //private subnets
        const vpc = cdk.aws_ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });
        const privateSubnets = vpc.selectSubnets({ subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS, onePerAz: true });
        const publicSubnets = vpc.selectSubnets({ subnetType: cdk.aws_ec2.SubnetType.PUBLIC, onePerAz: true });
        //shared Home File System
        const SharedHomeFileSystem = new cdk.aws_efs.FileSystem(this, "SharedHomeFileSystem", {
            vpc: vpc,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        //web app certificate
        const webAppAcmCert = new cdk.aws_certificatemanager.Certificate(this, "WebAppAcmCert", {
            domainName: props.baseDomain,
            subjectAlternativeNames: [`*.${props.baseDomain}`],
            validation: cdk.aws_certificatemanager.CertificateValidation.fromDns(),
        });

        const clientPrefixList = new cdk.aws_ec2.CfnPrefixList(this, "ClientPrefixList", {
            addressFamily: "IPv4",
            maxEntries: 10,
            prefixListName: "ClientPrefixList",
            entries: [
                {
                    cidr: "10.0.0.0/8",
                    description: "DC Clients",
                },
                {
                    cidr: "172.20.0.0/16",
                    description: "AWS Clients",
                },
            ],
        });


        //build parameter exports

        // RES Instance configuration
        
        this.parameterExports["EnvironmentName"] = `res-${props.envName}`;
        this.parameterExports["AdministratorEmail"] = adminEmail;
        this.parameterExports["CustomDomainNameforWebApp"] = props.baseDomain;
        this.parameterExports["ACMCertificateARNforWebApp"] = webAppAcmCert.certificateArn;
        this.parameterExports["SharedHomeFileSystemId"] = SharedHomeFileSystem.fileSystemId;
        this.parameterExports["InfrastructureHostAMI"] = "";
        this.parameterExports["IAMPermissionBoundary"] = "";
        this.parameterExports["CertificateSecretARNforVDI"] = cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "CertificateSecretforVDI", `${letsencryptSecretPath}/certcert.pem`).secretArn;
        this.parameterExports["PrivateKeySecretARNforVDI"] = cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "PrivateKeySecretforVDI", `${letsencryptSecretPath}/certprivkey.pem`).secretArn;
        this.parameterExports["SSHKeyPair"] = "RES-RSA-KEY";
        
        // Network configuration
        this.parameterExports["IsLoadBalancerInternetFacing"] = "false";
        this.parameterExports["VpcId"] = props.vpcId;
        this.parameterExports["InfrastructureHostSubnets"] =  privateSubnets.subnetIds;
        this.parameterExports["LoadBalancerSubnets"] = privateSubnets.subnetIds;
        this.parameterExports["VdiSubnets"] = privateSubnets.subnetIds;
        this.parameterExports["CustomDomainNameforVDI"] = `vdi.${props.baseDomain}`;
        this.parameterExports["ClientIp"] = "143.65.196.0/28";
        this.parameterExports["ClientPrefixList"] = clientPrefixList.ref;
        
        // Active Directory Configuration
        this.parameterExports["ADShortName"] = "crwin";
        this.parameterExports["ActiveDirectoryName"] = "crwin.crnet.org";
        this.parameterExports["LDAPConnectionURI"] = "ldap://crwin.crnet.org";
        this.parameterExports["DisableADJoin"] = "False";
        this.parameterExports["EnableLdapIDMapping"] = "True";
        this.parameterExports["LDAPBase"] = "OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org";
        this.parameterExports["ComputersOU"] = "OU=Computers,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org";
        this.parameterExports["GroupsOU"] = "OU=Groups,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org";
        this.parameterExports["UsersOU"] = "OU=Groups,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org";
        this.parameterExports["SudoersOU"] = "OU=Groups,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org";
        this.parameterExports["SudoersGroupName"] = "AR - AWS - RES - Sudouers";
        this.parameterExports["ServiceAccountUsername"] = "svcres";
        this.parameterExports["ServiceAccountUserDN"] = "UID=svcres,OU=Service Accounts,OU=General Accounts and Groups"
        this.parameterExports["ServiceAccountPasswordSecretArn"] = cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "ServiceAccountPasswordSecretArn", `res-ad-service-act-password`).secretArn;
        this.parameterExports["DomainTLSCertificateSecretArn"] = "";


        
        
        
        
        

        
        

        
        
        
        
        

        // const parameterExports = [
        //     {
        //         ParameterKey: "InfrastructureHostSubnets",
        //         ParameterValue: privateSubnetString,
        //     },
        //     {
        //         ParameterKey: "SharedHomeFileSystemId",
        //         ParameterValue: SharedHomeFileSystem.fileSystemId,
        //     },
        //     {
        //         ParameterKey: "SudoersGroupName",
        //         ParameterValue: "AR - AWS - RES - Sudouers",
        //     },
        //     {
        //         ParameterKey: "IAMPermissionBoundary",
        //         ParameterValue: "null",
        //     },
        //     {
        //         ParameterKey: "PrivateKeySecretARNforVDI",
        //         ParameterValue: cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "PrivateKeySecretforVDI", `${letsencryptSecretPath}/certprivkey.pem`).secretArn,
        //     },
        //     {
        //         ParameterKey: "CustomDomainNameforVDI",
        //         ParameterValue: `vdi.${props.baseDomain}`,
        //     },
        //     {
        //         ParameterKey: "ClientIp",
        //         ParameterValue: "143.65.196.0/28",
        //     },
        //     {
        //         ParameterKey: "ActiveDirectoryName",
        //         ParameterValue: "crwin.crnet.org",
        //     },
        //     {
        //         ParameterKey: "AdministratorEmail",
        //         ParameterValue: adminEmail,
        //     },
        //     {
        //         ParameterKey: "GroupsOU",
        //         ParameterValue: "OU=Groups,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
        //     },
        //     {
        //         ParameterKey: "ClientPrefixList",
        //         ParameterValue: clientPrefixList.ref,
        //     },
        //     {
        //         ParameterKey: "InfrastructureHostAMI",
        //         ParameterValue: "null",
        //     },
        //     {
        //         ParameterKey: "ServiceAccountPasswordSecretArn",
        //         ParameterValue: cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "ServiceAccountPasswordSecretArn", `res-ad-service-act-password`).secretArn,
        //     },
        //     {
        //         ParameterKey: "CertificateSecretARNforVDI",
        //         ParameterValue: cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "CertificateSecretforVDI", `${letsencryptSecretPath}/certcert.pem`).secretArn,
        //     },
        //     {
        //         ParameterKey: "SSHKeyPair",
        //         ParameterValue: "RES-RSA-KEY",
        //     },
        //     {
        //         ParameterKey: "ACMCertificateARNforWebApp",
        //         ParameterValue: webAppAcmCert.certificateArn,
        //     },
        //     {
        //         ParameterKey: "ADShortName",
        //         ParameterValue: "crwin",
        //     },
        //     {
        //         ParameterKey: "EnableLdapIDMapping",
        //         ParameterValue: "True",
        //     },
        //     {
        //         ParameterKey: "EnvironmentName",
        //         ParameterValue: `res-${props.envName}`,
        //     },
        //     {
        //         ParameterKey: "ServiceAccountUsername",
        //         ParameterValue: "svcres",
        //     },
        //     {
        //         ParameterKey: "CustomDomainNameforWebApp",
        //         ParameterValue: props.baseDomain,
        //     },
        //     {
        //         ParameterKey: "SudoersOU",
        //         ParameterValue: "OU=Groups,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
        //     },
        //     {
        //         ParameterKey: "LDAPBase",
        //         ParameterValue: "OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
        //     },
        //     {
        //         ParameterKey: "LoadBalancerSubnets",
        //         ParameterValue: privateSubnetString,
        //     },
        //     {
        //         ParameterKey: "VpcId",
        //         ParameterValue: props.vpcId,
        //     },
        //     {
        //         ParameterKey: "ComputersOU",
        //         ParameterValue: "OU=Computers,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
        //     },
        //     {
        //         ParameterKey: "DisableADJoin",
        //         ParameterValue: "False",
        //     },
        //     {
        //         ParameterKey: "DomainTLSCertificateSecretArn",
        //         ParameterValue: "null",
        //     },
        //     {
        //         ParameterKey: "VdiSubnets",
        //         ParameterValue: privateSubnetString,
        //     },
        //     {
        //         ParameterKey: "UsersOU",
        //         ParameterValue: "OU=Groups,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
        //     },
        //     {
        //         ParameterKey: "IsLoadBalancerInternetFacing",
        //         ParameterValue: "false",
        //     },
        //     {
        //         ParameterKey: "LDAPConnectionURI",
        //         ParameterValue: "ldaps://crwin.crnet.org",
        //     },
        // ];


        // parameterExports.forEach((Parameter) => {
        //     new cdk.CfnOutput(this, `RES${props.envName + Parameter.ParameterKey}`, { exportName: `RES${props.envName + Parameter.ParameterKey}`, value: Parameter.ParameterValue });
        // });
    }
}