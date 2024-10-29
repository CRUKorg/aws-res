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
        cdk.Tags.of(this).add("res:EnvironmentName", `res-${props.envName}`)
        cdk.Tags.of(this).add("res:ModuleName", "virtual-desktop-controller")
        const adminEmail = "ammar.rahman+admin@cancer.org.uk";
        //certificate for VDI
        const letsencryptSecretPath = `res-${props.envName}/vdi/cert/`;
        new Certbot(this, "VDICertificate", {
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
        //todo: fix security group and policy
        const SharedHomeFileSystem = new cdk.aws_efs.FileSystem(this, "SharedHomeFileSystem", {
            vpc: vpc,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        //web app certificate
        const webAppAcmCert = new cdk.aws_certificatemanager.Certificate(this, "WebAppAcmCert", {
            domainName: props.baseDomain,
            subjectAlternativeNames: [`*.${props.baseDomain}`],
            validation: cdk.aws_certificatemanager.CertificateValidation.fromDns(cdk.aws_route53.HostedZone.fromLookup(this, "HostedZone", {domainName: props.baseDomain })),
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
        this.parameterExports = {
            "EnvironmentName": `res-${props.envName}`,
            "AdministratorEmail": adminEmail,
            "CustomDomainNameforWebApp": props.baseDomain,
            "ACMCertificateARNforWebApp": webAppAcmCert.certificateArn,
            "SharedHomeFileSystemId": SharedHomeFileSystem.fileSystemId,
            "InfrastructureHostAMI": "",
            "IAMPermissionBoundary": "",
            "CertificateSecretARNforVDI": cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "CertificateSecretforVDI", `${letsencryptSecretPath}cert.pem`).secretArn,
            "PrivateKeySecretARNforVDI": cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "PrivateKeySecretforVDI", `${letsencryptSecretPath}privkey.pem`).secretArn,
            "SSHKeyPair": "RES-RSA-KEY",

            // Network configuration
            "IsLoadBalancerInternetFacing": "false",
            "VpcId": props.vpcId,
            "InfrastructureHostSubnets": privateSubnets.subnetIds,
            "LoadBalancerSubnets": privateSubnets.subnetIds,
            "VdiSubnets": privateSubnets.subnetIds,
            "CustomDomainNameforVDI": `vdi.${props.baseDomain}`,
            "ClientIp": "143.65.196.0/28",
            "ClientPrefixList": clientPrefixList.ref,

            // Active Directory Configuration
            "ADShortName": "crwin",
            "ActiveDirectoryName": "crwin.crnet.org",
            "LDAPConnectionURI": "ldap://crwin.crnet.org",
            "DisableADJoin": "False",
            "EnableLdapIDMapping": "True",
            "LDAPBase": "OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
            "ComputersOU": "OU=Computers,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
            "GroupsOU": "OU=Groups,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
            "UsersOU": "OU=Groups,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
            // "SudoersOU": "OU=Groups,OU=RES,OU=CRUK Applications,DC=crwin,DC=crnet,DC=org",
            "SudoersGroupName": "AR - AWS - RES - Sudouers",
            "ServiceAccountCredentialsSecretArn": cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "ServiceAccountCredentialsSecretArn", `res-ad-service-act-credentials`).secretArn,
            // "ServiceAccountUsername": "svcres",
            "ServiceAccountUserDN": "UID=svcres,OU=Service Accounts,OU=General Accounts and Groups",
            // "ServiceAccountPasswordSecretArn": cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, "ServiceAccountPasswordSecretArn", `res-ad-service-act-password`).secretArn,
            "DomainTLSCertificateSecretArn": "",
        };

    }
}
